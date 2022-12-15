var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
const { isLoggedIn } = require("../helpers/util");

module.exports = function (db) {
  let sql
  /* HOMEPAGE - DASHBOARD */
  router.route("/").get(isLoggedIn, async function (req, res) {
    try {
      // let sql = `SELECT "userid", "email", "name", "password", "role" FROM users ORDER BY "userid" ASC`;
      res.render("index", {
        user: req.session.user,
        active: `dashboard`,
      });
    } catch (error) {
      res.send("error");
    }
  });

  router.route("/logout").get(async function (req, res) {
    await req.session.destroy();
    res.redirect("/login");
  });

  /* LOGIN PAGE */
  router
    .route("/login")
    .get(async function (req, res) {
      res.render("login", { error: req.flash(`error`) });
    })
    .post(async function (req, res) {
      try {
        sql = `SELECT * FROM users WHERE email = $1`;
        const { email, password } = req.body;

        const checkEmail = await db.query(sql, [email]);
        if (checkEmail.rows.length == 0) {
          req.flash(`error`, `Email not registered!`);
          return res.redirect("/login");
        }

        const checkPassword = await bcrypt.compare(
          password,
          checkEmail.rows[0].password
        );
        if (!checkPassword) {
          req.flash(`error`, `Wrong password!`);
          return res.redirect("/login");
        }

        req.session.user = checkEmail.rows[0];

        if (req.session.user.role == 'operator') {
          return res.redirect('/sales')
        }

        res.redirect("/");
      } catch (error) {
        res.send(error);
      }
    });

  /* REGISTRATION PAGE */
  router
    .route("/register")
    .get(async function (req, res) {
      res.render("register", { error: req.flash(`error`) });
    })
    .post(async function (req, res) {
      try {
        sql = `SELECT * FROM users where email = $1`;
        const { name, email, password } = req.body;
        const role = "admin";

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const checkData = await db.query(sql, [email]);
        if (checkData.rowCount > 0) {
          req.flash(`error`, `Email already registered`);
          return res.redirect("/register");
        }

        sql = `INSERT INTO users("email", "name", "password", "role") VALUES ($1, $2, $3, $4)`;

        const insertData = await db.query(sql, [
          email,
          name,
          hashedPassword,
          role,
        ]);

        res.redirect("/login");
      } catch (error) {
        res.send(error);
      }
    });

  return router;
};
