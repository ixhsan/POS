var express = require("express");
var router = express.Router();
const moment = require("moment");
const { isLoggedIn } = require("../helpers/util");

module.exports = function (db) {
  let fromSales;

  /* OVERVIEW */
  router
    .route("/")
    // Render sales page
    .get(isLoggedIn, async function (req, res) {
      try {
        //. Return response
        res.render("./sales/sales", {
          user: req.session.user,
          success: req.flash(`success`),
          error: req.flash(`error`),
          active: `sales`,
        });
      } catch (error) {
        res.json(error);
      }
    });

  router
    .route("/table")
    // Read sales table
    .get(isLoggedIn, async function (req, res) {
      try {
        //. Request
        let params = [];
        if (req.query.search.value) {
          params.push(`invoice ILIKE '%${req.query.search.value}%'`);
        }
        const limit = req.query.length;
        const offset = req.query.start;
        const sortBy = req.query.columns[req.query.order[0].column].data;
        const sortMode = req.query.order[0].dir;
        //. Add variable
        let queryTotal = `SELECT count(*) as TOTAL FROM sales${
          params.length > 0 ? ` WHERE ${params.join(" OR ")}` : ""
        }`;
        let queryData = `SELECT * FROM sales LEFT OUTER JOIN customers ON sales.customer = customers.customerid${
          params.length > 0 ? ` WHERE ${params.join(" OR ")}` : ""
        } ORDER BY ${sortBy} ${sortMode} LIMIT ${limit} OFFSET ${offset}`;
        //. Querying
        const total = await db.query(queryTotal);
        const data = await db.query(queryData);
        const response = {
          draw: Number(req.query.draw),
          recordsTotal: total.rows[0].total,
          recordsFiltered: total.rows[0].total,
          data: data.rows,
          info: req.flash(`info`),
        };
        //. Return response
        res.json(response);
      } catch (error) {
        res.json(error);
      }
    });

  router
    .route("/new-transaction")
    // Generate new invoice then redirect to add form
    .get(isLoggedIn, async function (req, res) {
      try {
        //. Request
        const { userid } = req.session.user;
        //. Add variable
        fromSales = `INSERT INTO sales (totalsum, operator) VALUES(0, $1) returning *`;
        //. Querying
        const { rows: getInvoice } = await db.query(fromSales, [userid]);
        //. Return response
        res.redirect(`/sales/transaction/${getInvoice[0].invoice}`);
      } catch (error) {
        res.json(error);
      }
    });

  /* TRANSACTION */
  router
    .route("/transaction/:invoice")
    // Render add form
    .get(isLoggedIn, async function (req, res) {
      try {
        //. Request
        const { invoice } = req.params;
        //. Add variable
        let sqlGetSales = `SELECT sales.invoice as invoice, sales.time as time, users.name as operator, sales.totalsum as totalsum, sales.pay as pay, sales.change as change, sales.customer as customer FROM sales LEFT OUTER JOIN users ON sales.operator = users.userid LEFT OUTER JOIN customers ON sales.customer = customers.customerid WHERE "invoice" = $1`;
        let sqlGetGoods = `SELECT * FROM goods ORDER BY "barcode" ASC`;
        let sqlGetCustomers = `SELECT * FROM customers ORDER BY "customerid" ASC`;
        //. Querying
        const { rows: getInvoice } = await db.query(sqlGetSales, [invoice]);
        const { rows: getGoods } = await db.query(sqlGetGoods);
        const { rows: getCustomers } = await db.query(sqlGetCustomers);
        //. Return response
        res.render("./sales/edit", {
          user: req.session.user,
          invoice: getInvoice[0],
          goods: getGoods,
          customer: getCustomers,
          info: req.flash(`info`),
          setDate: moment,
          active: `sales/edit`,
        });
      } catch (error) {
        res.json(error);
      }
    })
    // Save payment and customer in a sales transaction
    .post(isLoggedIn, async function (req, res) {
      try {
        //. Request
        const { invoice } = req.params;
        const { pay = 0, change = 0, customer = 1 } = req.body;

        //. Add variable
        fromSales = `UPDATE sales SET "pay" = $1, "change" = $2, "customer" = $3 WHERE "invoice" = $4 returning *`;
        //. Return response 1
        const {rows: salesUpdated} = await db.query(fromSales, [pay, change, customer, invoice]);

        if (salesUpdated.length < 1) {
          req.flash(`error`, `Failure when updating sales number ${invoice}`)
        } else {
          req.flash(`success`, `Sales number ${invoice} has been updated!`)
        }
        
        res.redirect("/sales");
      } catch (error) {
        res.json(error);
      }
    })
    // Remove an invoice from sales list
    .delete(isLoggedIn, async function (req, res) {
      try {
        //. Request
        const { invoice } = req.params;
        //. Add variable
        fromSales = `DELETE FROM sales WHERE "invoice" = $1 returning *`;
        //. Querying
        const { rows: itemDeleted } = await db.query(fromSales, [invoice]);
        //. Return response
        res.json(itemDeleted);
      } catch (error) {
        res.json(error);
      }
    });

  router
    .route("/data/invoice/:invoice")
    // Populate invoice table
    .get(isLoggedIn, async function (req, res) {
      try {
        //. Request
        const { invoice } = req.params;
        const sortBy = req.query.columns[req.query.order[0].column].data;
        const sortMode = req.query.order[0].dir;
        //. Add variable
        let params = [];
        let sqlGetItemList = `SELECT saleitems.id, saleitems.invoice, saleitems.itemcode, goods.name, saleitems.quantity, saleitems.sellingprice, saleitems.totalprice FROM saleitems LEFT OUTER JOIN goods ON saleitems.itemcode = goods.barcode WHERE invoice = $1`;
        //. Querying
        const getData = await db.query(sqlGetItemList, [invoice]);
        const response = {
          draw: Number(req.query.draw),
          data: getData.rows,
        };
        //. Return response
        res.json(response);
      } catch (error) {
        res.json(error);
      }
    })
    // Add a new item into invoice list and update totalSum
    .post(isLoggedIn, async function (req, res) {
      try {
        // Add item to the list
        //. Request
        const { itemcode, quantity } = req.body;
        const { invoice } = req.params;

        //. Add variable
        let sqlAddItems = `INSERT INTO saleitems("invoice", "itemcode", "quantity") VALUES ($1, $2, $3) returning *`;
        let sqlUpdateSum = `SELECT * FROM sales WHERE "invoice" = $1`;

        //. Querying
        const { rows: itemAdded } = await db.query(sqlAddItems, [
          invoice,
          itemcode,
          parseInt(quantity),
        ]);

        // then update the total SUM
        const { rows: getSum } = await db.query(sqlUpdateSum, [invoice]);

        //. Returning response
        res.json({
          data: getSum[0],
        });
      } catch (error) {
        res.json(error);
      }
    });

  router
    .route("/data/item/:id")
    // Remove an item from an invoice and update totalSum
    .delete(isLoggedIn, async function (req, res) {
      try {
        //. Request
        const { id } = req.params;
        const { invoice } = req.body;

        //. Add variable
        let sqlDeleteItem = `DELETE FROM saleitems WHERE "id" = $1 returning *`;
        let sqlUpdateSum = `SELECT * FROM sales WHERE "invoice" = $1`;

        //. Querying
        const { rows: itemDeleted } = await db.query(sqlDeleteItem, [
          parseInt(id),
        ]);
        // then update the total SUM
        const { rows: getSum } = await db.query(sqlUpdateSum, [invoice]);

        //. Returning response
        res.json({
          data: getSum[0],
        });
      } catch (error) {
        res.json(error);
      }
    });

  router
    .route("/data/goods/:barcode")
    // Get item from goods
    .post(isLoggedIn, async function (req, res) {
      try {
        //. Request
        const { barcode } = req.params;
        //. Add variable
        let sqlGetGoods = `SELECT * FROM goods WHERE barcode = $1 ORDER BY "barcode" ASC`;
        //. Querying
        const { rows: getGoods } = await db.query(sqlGetGoods, [barcode]);
        //. Returning response
        res.json(getGoods[0]);
      } catch (error) {
        res.json(error);
      }
    });

  return router;
};
