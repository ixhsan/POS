var express = require("express");
var router = express.Router();
const { isLoggedIn } = require("../helpers/util");

module.exports = function (db) {
  let sql;

  router
    .route("/")
    // 1. Render customers page
    .get(isLoggedIn, async function (req, res) {
      try {
        res.render("./customers/customers", {
          user: req.session.user,
          success: req.flash(`success`),
          error: req.flash(`error`),
          active: `customers`,
        });
      } catch (error) {
        res.json(error);
      }
    });

  router
    .route("/add")
    // 2. Render add page
    .get(isLoggedIn, async function (req, res) {
      try {
        res.render("./customers/add", {
          user: req.session.user,
          active: `customers/add`,
        });
      } catch (error) {
        res.json(error);
      }
      // Adding customer method
    })
    // 2. Add new customers
    .post(isLoggedIn, async function (req, res) {
      try {
        const { name, address, phone } = req.body;

        sql = `INSERT INTO customers("name", "address", "phone") VALUES($1,$2,$3) returning *`;

        const { rows: addCustomer } = await db.query(sql, [
          name,
          address,
          phone,
        ]);

        if (addCustomer.length > 0) {
          req.flash(`success`, `A new customer ${name} has been added!`);
        } else {
          req.flash(`error`, `Error when adding customer ${name}!`);
        }

        res.redirect("/customers");
      } catch (error) {
        res.json(error);
      }
    });

  router
    .route("/data")
    // 3. Populate datatable
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

        let queryTotal = `SELECT count(*) as TOTAL FROM customers${
          params.length > 0 ? ` WHERE ${params.join(" OR ")}` : ""
        }`;
        let queryData = `SELECT * FROM customers${
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
    .route("/data/:customerid")
    // 4. Render edit page
    .get(isLoggedIn, async function (req, res) {
      try {
        sql = `SELECT * FROM customers WHERE "customerid" = $1`;

        const { customerid } = req.params;

        const selectData = await db.query(sql, [customerid]);

        res.render("./customers/edit", {
          user: req.session.user,
          data: selectData.rows,
          active: `customers/edit`,
        });
      } catch (error) {
        res.json(error);
      }
    })
    // 5. Saved updated data
    .post(isLoggedIn, async function (req, res) {
      try {
        sql = `UPDATE customers SET "name" = $1, "address" = $2, "phone" = $3 WHERE "customerid" = $4 returning *`;

        const { name, address, phone } = req.body;

        const response = [name, address.trim(), phone, req.params.customerid];

        const { rows: updateCustomer } = await db.query(sql, response);

        if (updateCustomer.length > 0) {
          req.flash(`success`, `Customer ${name} has been updated!`);
        } else {
          req.flash(`error`, `Error when updating customer ${name}'s data!`);
        }

        res.redirect("/customers");
      } catch (error) {
        res.json(error);
      }
    })
    // 6. Delete customers data
    .delete(isLoggedIn, async function (req, res) {
      try {
        sql = `DELETE FROM customers WHERE "customerid" = $1`;
        const customerid = req.params.customerid;
        console.log("ini route delete", sql, customerid);
        const deleteData = await db.query(sql, [customerid]);
        res.json(deleteData);
      } catch (error) {
        res.json(error);
      }
    });

  return router;
};
