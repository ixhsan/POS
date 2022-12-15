var express = require("express");
var router = express.Router();
const { isLoggedIn } = require("../helpers/util");

module.exports = function (db) {
  let sql;

  router
    .route("/")
    // 1. Render suppliers page
    .get(isLoggedIn, async function (req, res) {
      try {
        res.render("./suppliers/suppliers", {
          user: req.session.user,
          success: req.flash(`success`),
          error: req.flash(`error`),
          active: `suppliers`,
        });
      } catch (error) {
        res.json(error);
      }
    });

  router
    .route("/add")
    // 2. Render add supplier page
    .get(isLoggedIn, async function (req, res) {
      try {
        res.render("./suppliers/add", {
          user: req.session.user,
          active: `suppliers/add`,
        });
      } catch (error) {
        res.json(error);
      }
    })
    // 3. Add a supplier (CREATE)
    .post(isLoggedIn, async function (req, res) {
      try {
        const { name, address, phone } = req.body;

        // /* Driver code to add data */
        sql = `INSERT INTO suppliers("name", "address", "phone") VALUES($1,$2,$3) returning *`;

        const { rows: addSupplier } = await db.query(sql, [
          name,
          address,
          phone,
        ]);

        if (addSupplier.length > 0) {
          req.flash(`success`, `A new supplier ${name} has been added!`);
        } else {
          req.flash(`error`, `Error when adding new supplier ${name}!`);
        }

        res.redirect("/suppliers");
      } catch (error) {
        res.json(error);
      }
    });

  router
    .route("/data")
    // 4. Populate datatable (READ, BROWSE)
    .get(isLoggedIn, async function (req, res) {
      try {
        let params = [];

        if (req.query.search.value) {
          params.push(`name ILIKE '%${req.query.search.value}%'`);
          params.push(`address ILIKE '%${req.query.search.value}%'`);
          params.push(`phone ILIKE '%${req.query.search.value}%'`);
        }

        const limit = req.query.length;
        const offset = req.query.start;
        const sortBy = req.query.columns[req.query.order[0].column].data;
        const sortMode = req.query.order[0].dir;

        let queryTotal = `SELECT count(*) as TOTAL FROM suppliers${
          params.length > 0 ? ` WHERE ${params.join(" OR ")}` : ""
        }`;
        let queryData = `SELECT * FROM suppliers${
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
    });

  router
    .route("/data/:supplierid")
    // 4. Render edit page
    .get(isLoggedIn, async function (req, res) {
      try {
        sql = `SELECT * FROM suppliers WHERE "supplierid" = $1`;

        const { supplierid } = req.params;

        const { rows: getSuppliersData } = await db.query(sql, [supplierid]);

        res.render("./suppliers/edit", {
          user: req.session.user,
          data: getSuppliersData,
          active: `suppliers/edit`,
        });
      } catch (error) {
        res.json(error);
      }
    })
    // 5. Update supplier (UPDATE)
    .post(isLoggedIn, async function (req, res) {
      try {
        // /* Driver code to update data */
        sql = `UPDATE suppliers SET "name" = $1, "address" = $2, "phone" = $3 WHERE "supplierid" = $4 returning *`;

        const { name, address, phone } = req.body;
        const { rows: updateSupplier } = await db.query(sql, [
          name,
          address.trim(),
          phone,
          req.params.supplierid,
        ]);

        if (updateSupplier.length > 0) {
          req.flash(`success`, `Supplier ${name} has been updated!`);
        } else {
          req.flash(`error`, `Error when updating ${name}'s data!`);
        }

        res.redirect("/suppliers");
      } catch (error) {
        res.json(error);
      }
    })
    // 5. Delete a supplier (DELETE)
    .delete(isLoggedIn, async function (req, res) {
      try {
        const supplierid = req.params.supplierid;

        sql = `DELETE FROM suppliers WHERE "supplierid" = $1`;
        const { rows: deleteASupplier } = await db.query(sql, [supplierid]);

        res.json(deleteASupplier);
      } catch (error) {
        res.json(error);
      }
    });

  return router;
};
