var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
const { isAdmin } = require("../helpers/util");

module.exports = function (db) {
  let sql;

  router
    .route("/")
    // 1. Render users page
    .get(isAdmin, async function (req, res) {
      try {
        res.render("./users/users", {
          user: req.session.user,
          error: req.flash(`error`),
          success: req.flash(`success`),
          active: `users`
        });
      } catch (error) {
        res.json(error);
      }
    });

  router
    .route("/add")
    // 2. Render add users page
    .get(isAdmin, async function (req, res) {
      try {
        res.render("./users/add", {
          user: req.session.user,
          active: `users/add`
        });
      } catch (error) {
        res.json(error);
      }
    })
    // 2. Add a new user (CREATE)
    .post(isAdmin, async function (req, res) {
      try {
        const { name, email, password, role } = req.body;

        // Save data if there are no checkTag
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        sql = `INSERT INTO users("email", "name", "password", "role") VALUES ($1, $2, $3, $4) returning *`;

        const { rows: newUser } = await db.query(sql, [
          email,
          name,
          hashedPassword,
          role,
        ]);

        if (newUnit.length > 0) {
          req.flash(`success`, `A new user ${name} has been added!`);
        } else {
          req.flash(`error`, `Error when adding a new unit ${name}!`);
        }

        res.redirect('/users');
      } catch (error) {
        res.json(error);
      }
    });

  router
    .route("/data")
    // 3. Populate datatable (BROWSE, READ)
    .get(isAdmin, async function (req, res) {
      try {
        let params = [];

        if (req.query.search.value) {
          params.push(`name like '%${req.query.search.value}%'`);
          params.push(`email like '%${req.query.search.value}%'`);
        }

        const limit = req.query.length;
        const offset = req.query.start;
        const sortBy = req.query.columns[req.query.order[0].column].data;
        const sortMode = req.query.order[0].dir;

        let queryTotal = `select count(*) as total from users${
          params.length > 0 ? ` where ${params.join(" or ")}` : ""
        }`;
        let queryData = `select * from users${
          params.length > 0 ? ` where ${params.join(" or ")}` : ""
        } order by ${sortBy} ${sortMode} limit ${limit} offset ${offset}`;

        const { rows: total } = await db.query(queryTotal);
        const { rows: data } = await db.query(queryData);

        const response = {
          draw: Number(req.query.draw),
          recordsTotal: total[0].total,
          recordsFiltered: total[0].total,
          data: data,
          info: req.flash(`info`),
        };

        res.json(response);
      } catch (error) {
        res.json(error);
      }
    })
    // 4. Check if email already exist
    .post(isAdmin, async function (req, res) {
      try {
        const { email } = req.body;

        sql = `SELECT * FROM users WHERE email = $1`;
        const { rows: getEmail } = await db.query(sql, [email]);

        if (getEmail.length) {
          return res.json({
            data: null,
          });
        }

        res.json({
          data: getEmail,
        });
      } catch (error) {
        res.json;
      }
    });

  router
    .route("/data/:userid")
    // 5. Render edit page
    .get(isAdmin, async function (req, res) {
      try {
        const userid = parseInt(req.params.userid);

        sql = `SELECT * FROM users WHERE "userid" = $1`;
        const { rows: getUser } = await db.query(sql, [userid]);

        res.render("./users/edit", {
          user: req.session.user,
          data: getUser[0],
          active: `users/edit`
        });
      } catch (error) {
        res.json(error);
      }
    })
    // 6. Update edited user data (UPDATE)
    .post(isAdmin, async function (req, res) {
      try {
        const { email, name, role } = req.body;
        const { userid } = req.params;
        sql = `UPDATE users SET "email" = $1, "name" = $2, "role" = $3 WHERE "userid" = $4 returning *`;
        const { rows: updateUser } = await db.query(sql, [email, name, role, parseInt(userid)]);

        if (newUnit.length > 0) {
          req.flash(`success`, `User ${name} has been updated!`);
        } else {
          req.flash(`error`, `Error when updating user ${name}!`);
        }
        res.redirect("/users");
      } catch (error) {
        res.json(error);
      }
    })
    // 7. Delete a user (DELETE)
    .delete(isAdmin, async function (req, res) {
      try {
        sql = `DELETE FROM users WHERE "userid" = $1`;
        const userid = parseInt(req.params.userid);
        const { rows: deleteUser } = await db.query(sql, [userid]);
        res.json(deleteUser);
      } catch (error) {
        res.json(error);
      }
    });

  return router;
};
