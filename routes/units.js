var express = require("express");
const { isAdmin } = require("../helpers/util");
var router = express.Router();

module.exports = function (db) {
  let sql;

  router
    .route("/")
    // 1. Render units page
    .get(isAdmin, async function (req, res) {
      try {
        res.render("./units/units", {
          user: req.session.user,
          success: req.flash(`success`),
          error: req.flash(`error`),
          active: `units`,
        });
      } catch (error) {
        res.json(error);
      }
    });

  router
    .route("/add")
    // 2. Render add units page
    .get(isAdmin, async function (req, res) {
      try {
        res.render("./units/add", {
          user: req.session.user,
          active: `units/add`,
        });
      } catch (error) {
        res.json(error);
      }
    })
    // 2. Add a new units (CREATE)
    .post(isAdmin, async function (req, res) {
      try {
        const { unit, name, note } = req.body;

        // Save data
        sql = `INSERT INTO units("unit", "name", "note") VALUES ($1, $2, $3) returning *`;

        const { rows: newUnit } = await db.query(sql, [unit, name, note]);

        if (newUnit.length > 0) {
          req.flash(`success`, `A new unit ${unit} has been added!`);
        } else {
          req.flash(`error`, `Error when adding a new unit ${unit}!`);
        }

        res.redirect("/units");
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
          params.push(`unit ILIKE '%${req.query.search.value}%'`);
          params.push(`name ILIKE '%${req.query.search.value}%'`);
          params.push(`note ILIKE '%${req.query.search.value}%'`);
        }

        const limit = req.query.length;
        const offset = req.query.start;
        const sortBy = req.query.columns[req.query.order[0].column].data;
        const sortMode = req.query.order[0].dir;

        let queryTotal = `SELECT count(*) as TOTAL FROM units${
          params.length > 0 ? ` WHERE ${params.join(" OR ")}` : ""
        }`;
        let queryData = `SELECT * FROM units${
          params.length > 0 ? ` WHERE ${params.join(" OR ")}` : ""
        } ORDER BY ${sortBy} ${sortMode} LIMIT ${limit} OFFSET ${offset}`;

        const { rows: total } = await db.query(queryTotal);
        const { rows: data } = await db.query(queryData);

        const response = {
          draw: Number(req.query.draw),
          recordsTotal: total[0].total,
          recordsFiltered: total[0].total,
          data: data,
        };

        res.json(response);
      } catch (error) {
        res.json(error);
      }
    })
    // 2. Check if unit already exist
    .post(isAdmin, async function (req, res) {
      try {
        sql = `SELECT * FROM units WHERE unit = $1`;
        const { unit } = req.body;

        const { rows: unitExist } = await db.query(sql, [unit]);

        if (unitExist.length) {
          return res.json({
            data: null,
          });
        }

        res.json({
          data: unitExist,
        });
      } catch (error) {
        res.json;
      }
    });

  router
    .route("/data/:unit")
    // 5. Render edit page
    .get(isAdmin, async function (req, res) {
      try {
        const unit = req.params.unit;

        sql = `SELECT * FROM units WHERE "unit" = $1`;
        const { rows: getUnitdata } = await db.query(sql, [unit]);

        res.render("./units/edit", {
          user: req.session.user,
          data: getUnitdata[0],
          active: `units/edit`,
        });
      } catch (error) {
        res.json(error);
      }
    })
    // 6. Update edited user data (UPDATE)
    .post(isAdmin, async function (req, res) {
      try {
        const { unit, name, note } = req.body;

        sql = `UPDATE units SET "unit" = $1, "name" = $2, "note" = $3 WHERE "unit" = $4 returning *`;
        const { rows: updateUnit } = await db.query(sql, [
          unit,
          name,
          note,
          req.params.unit,
        ]);

        if (updateUnit.length > 0) {
          req.flash(`success`, `Unit ${unit} has been updated!`);
        } else {
          req.flash(`error`, `Error when updating unit ${unit}!`);
        }

        res.redirect("/units")
      } catch (error) {
        res.json(error);
      }
    })
    // 7. Delete a user (DELETE)
    .delete(isAdmin, async function (req, res) {
      try {
        const unit = req.params.unit;

        sql = `DELETE FROM units WHERE "unit" = $1`;
        const { rows: deleteUser } = await db.query(sql, [unit]);

        res.json(deleteUser);
      } catch (error) {
        res.json(error);
      }
    });

  return router;
};
