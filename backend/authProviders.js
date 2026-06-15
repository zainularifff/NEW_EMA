const passport = require("passport");
const jwt = require("jsonwebtoken");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { OIDCStrategy } = require("passport-azure-ad");

const APP_URL = (process.env.APP_URL || process.env.FRONTEND_URL || "").replace(/\/+$/, "");
const API_URL = (process.env.API_URL || process.env.PUBLIC_API_URL || "").replace(/\/+$/, "");
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

function createAppToken(user, provider) {
  return jwt.sign(
    {
      provider,
      email: user.email,
      name: user.name,
      providerId: user.providerId,
    },
    JWT_SECRET,
    { expiresIn: "8h" }
  );
}

function normalizeGoogleProfile(profile) {
  return {
    providerId: profile.id,
    email: profile.emails?.[0]?.value || "",
    name: profile.displayName || profile.emails?.[0]?.value || "Google User",
  };
}

function normalizeMicrosoftProfile(profile) {
  return {
    providerId: profile.oid || profile.sub,
    email:
      profile._json?.preferred_username ||
      profile.upn ||
      profile.emails?.[0] ||
      "",
    name:
      profile.displayName ||
      profile._json?.name ||
      profile._json?.preferred_username ||
      "Microsoft User",
  };
}

function setupAuthProviders(app) {
  app.use(passport.initialize());

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${API_URL}/api/auth/google/callback`,
        },
        (_accessToken, _refreshToken, profile, done) => {
          done(null, normalizeGoogleProfile(profile));
        }
      )
    );
  }

  if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
    passport.use(
      "microsoft",
      new OIDCStrategy(
        {
          identityMetadata: `https://login.microsoftonline.com/${
            process.env.MICROSOFT_TENANT_ID || "common"
          }/v2.0/.well-known/openid-configuration`,
          clientID: process.env.MICROSOFT_CLIENT_ID,
          clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
          responseType: "code",
          responseMode: "query",
          redirectUrl: `${API_URL}/api/auth/microsoft/callback`,
          allowHttpForRedirectUrl: process.env.NODE_ENV !== "production",
          scope: ["profile", "email", "openid"],
          passReqToCallback: false,
        },
        (_iss, _sub, profile, _accessToken, _refreshToken, done) => {
          done(null, normalizeMicrosoftProfile(profile));
        }
      )
    );
  }

  app.get("/api/auth/google", (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.redirect(`${APP_URL}/login?error=google_not_configured`);
    }

    return passport.authenticate("google", {
      scope: ["profile", "email"],
      session: false,
    })(req, res, next);
  });

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", {
      failureRedirect: `${APP_URL}/login?error=google_auth_failed`,
      session: false,
    }),
    (req, res) => {
      const user = req.user;
      const token = createAppToken(user, "google");

      res.redirect(
        `${APP_URL}/login?token=${encodeURIComponent(
          token
        )}&provider=google&email=${encodeURIComponent(user.email || "")}`
      );
    }
  );

  app.get("/api/auth/microsoft", (req, res, next) => {
    if (
      !process.env.MICROSOFT_CLIENT_ID ||
      !process.env.MICROSOFT_CLIENT_SECRET
    ) {
      return res.redirect(`${APP_URL}/login?error=microsoft_not_configured`);
    }

    return passport.authenticate("microsoft", {
      session: false,
    })(req, res, next);
  });

  app.get(
    "/api/auth/microsoft/callback",
    passport.authenticate("microsoft", {
      failureRedirect: `${APP_URL}/login?error=microsoft_auth_failed`,
      session: false,
    }),
    (req, res) => {
      const user = req.user;
      const token = createAppToken(user, "microsoft");

      res.redirect(
        `${APP_URL}/login?token=${encodeURIComponent(
          token
        )}&provider=microsoft&email=${encodeURIComponent(user.email || "")}`
      );
    }
  );
}

module.exports = {
  setupAuthProviders,
};
