const { AuthService } = require("./auth.service");
const { clearRefreshCookie, getRefreshCookie, setRefreshCookie } = require("../../utils/cookies");

class AuthController {
  constructor(service = new AuthService()) {
    this.service = service;
  }

  login = async (req, res, next) => {
    try {
      const session = await this.service.login(req.body, {
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip,
      });
      setRefreshCookie(res, session.refreshToken);
      const { refreshToken, ...data } = session;
      res.json({ data });
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req, res, next) => {
    try {
      const session = await this.service.refresh(getRefreshCookie(req));
      res.json({ data: session });
    } catch (error) {
      clearRefreshCookie(res);
      next(error);
    }
  };

  logout = async (req, res, next) => {
    try {
      await this.service.logout(getRefreshCookie(req));
      clearRefreshCookie(res);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  me = async (req, res, next) => {
    try {
      const user = await this.service.me(req.auth.sub);
      res.json({ data: user });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { AuthController };
