var express = require("express");
var router = express.Router();
const moment = require("moment");
const { isLoggedIn } = require("../helpers/util");

module.exports = function (db) {
  let fromPurchases;

  router
    .route("/")
    // Render purchases page
    .get(isLoggedIn, async function (req, res) {
      try {
        res.render("./purchases/purchases", {
          user: req.session.user,
          success: req.flash(`success`),
          error: req.flash(`error`),
          active: `purchases`,
        });
      } catch (error) {
        res.json(error);
      }
    });

  router
    .route("/table")
    // Read purchases table
    .get(isLoggedIn, async function (req, res) {
      try {
        let params = [];

        if (req.query.search.value) {
          params.push(`invoice ILIKE '%${req.query.search.value}%'`);
        }

        const limit = req.query.length;
        const offset = req.query.start;
        const sortBy = req.query.columns[req.query.order[0].column].data;
        const sortMode = req.query.order[0].dir;

        let queryTotal = `SELECT count(*) as TOTAL FROM purchases${
          params.length > 0 ? ` WHERE ${params.join(" OR ")}` : ""
        }`;
        let queryData = `SELECT * FROM purchases LEFT OUTER JOIN suppliers ON purchases.supplier = suppliers.supplierid ${
          params.length > 0 ? ` WHERE ${params.join(" OR ")}` : ""
        } ORDER BY ${sortBy} ${sortMode} LIMIT ${limit} OFFSET ${offset}`;

        const total = await db.query(queryTotal);
        const data = await db.query(queryData);

        const response = {
          draw: Number(req.query.draw),
          recordsTotal: total.rows[0].total,
          recordsFiltered: total.rows[0].total,
          data: data.rows,
          info: req.flash(`info`),
        };

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
        const { userid } = req.session.user;
        fromPurchases = `INSERT INTO purchases (totalsum, operator) VALUES(0, $1) returning *`;
        const getInvoice = await db.query(fromPurchases, [userid]);
        res.redirect(`/purchases/transaction/${getInvoice.rows[0].invoice}`);
      } catch (error) {
        res.json(error);
      }
    });

  router
    .route("/transaction/:invoice")
    // Render add form
    .get(isLoggedIn, async function (req, res) {
      try {
        const { invoice } = req.params;

        let fromPurchases = `SELECT purchases.invoice as invoice, purchases.time as time, users.name as operator, purchases.totalsum as totalsum, purchases.supplier as supplier FROM purchases LEFT OUTER JOIN users ON purchases.operator = users.userid LEFT OUTER JOIN suppliers ON purchases.supplier = suppliers.supplierid WHERE "invoice" = $1`;
        let fromGoods = `SELECT * FROM goods ORDER BY "barcode" ASC`;
        let fromSupplier = `SELECT * FROM suppliers ORDER BY "supplierid" ASC`;

        const getPurchases = await db.query(fromPurchases, [invoice]);
        const getGoods = await db.query(fromGoods);
        const getSupplier = await db.query(fromSupplier);
        res.render("./purchases/edit", {
          user: req.session.user,
          invoice: getPurchases.rows[0],
          goods: getGoods.rows,
          supplier: getSupplier.rows,
          info: req.flash(`info`),
          setDate: moment,
          active: `purchases/invoice`,
        });
      } catch (error) {
        res.json(error);
      }
    })
    // Save totalsum and supplier in a purchase transaction
    .post(isLoggedIn, async function (req, res) {
      try {
        const { invoice } = req.params;
        const { supplier = 1 } = req.body;

        let sqlUpdatePurchases = `UPDATE purchases SET "supplier" = $1 WHERE "invoice" = $2 returning * `;
        const { rows: purchasesUpdated } = await db.query(sqlUpdatePurchases, [
          supplier,
          invoice,
        ]);

        if (purchasesUpdated.length < 1) {
          req.flash(`error`, `Failure when updating purchases number ${invoice}`);
        } else {
          req.flash(`success`, `Purchases number ${invoice} has been updated!`);
        }
        
        res.redirect("/purchases");
      } catch (error) {
        res.json(error);
      }
    })
    // Remove an invoice from purchases list
    .delete(isLoggedIn, async function (req, res) {
      try {
        let fromPurchases = `DELETE FROM purchases WHERE "invoice" = $1`;
        const whereInvoice = req.params.invoice;
        const removeInvoice = await db.query(fromPurchases, [whereInvoice]);
        res.json(getPurchases.rows[0]);
      } catch (error) {
        res.json(error);
      }
    });

  router
    .route("/data/invoice/:invoice")
    // Populate invoice table
    .get(isLoggedIn, async function (req, res) {
      try {
        const { invoice } = req.params;
        let params = [];

        const sortBy = req.query.columns[req.query.order[0].column].data;
        const sortMode = req.query.order[0].dir;

        fromInvoiceJoin = `SELECT purchaseitems.id, purchaseitems.invoice, purchaseitems.itemcode, goods.name, purchaseitems.quantity, purchaseitems.purchaseprice, purchaseitems.totalprice FROM purchaseitems LEFT OUTER JOIN goods ON purchaseitems.itemcode = goods.barcode WHERE invoice = $1`;

        const data = await db.query(fromInvoiceJoin, [invoice]);

        const response = {
          draw: Number(req.query.draw),
          data: data.rows,
        };

        res.json(response);
      } catch (error) {
        res.json(error);
      }
    })
    // Add a new item into invoice list and update totalSum
    .post(isLoggedIn, async function (req, res) {
      try {
        const { itemcode, quantity } = req.body;
        const { invoice } = req.params;

        let sqlAddItems = `INSERT INTO purchaseitems("invoice", "itemcode", "quantity") VALUES ($1, $2, $3) returning *`;
        let sqlUpdateSum = `SELECT * FROM purchases WHERE "invoice" = $1`;

        const { rows: itemAdded } = await db.query(sqlAddItems, [
          invoice,
          itemcode,
          parseInt(quantity),
        ]);

        const { rows: getSum } = await db.query(sqlUpdateSum, [invoice]);
        res.json({
          data: getSum[0],
        });
      } catch (error) {
        res.json(error);
      }
    });

  router
    .route("/data/item/:id")
    // Remove an item from an invoice
    .delete(isLoggedIn, async function (req, res) {
      try {
        const { id } = req.params;
        const { invoice } = req.body;

        sqlDeleteItem = `DELETE FROM purchaseitems WHERE "id" = $1 returning *`;
        sqlUpdateSum = `SELECT * FROM purchases WHERE "invoice" = $1`;

        const { rows: itemDeleted } = await db.query(sqlDeleteItem, [
          parseInt(id),
        ]);
        const { rows: getSum } = await db.query(sqlUpdateSum, [invoice]);

        res.json({
          data: getSum[0],
        });
      } catch (error) {
        res.json(error);
      }
    });

  // Get item from goods
  router
    .route("/data/goods/:barcode")
    .post(isLoggedIn, async function (req, res) {
      try {
        const { barcode } = req.params;
        let fromGoods = `SELECT * FROM goods WHERE barcode = $1 ORDER BY "barcode" ASC`;
        const getList = await db.query(fromGoods, [barcode]);
        res.json(getList.rows[0]);
      } catch (error) {
        res.json(error);
      }
    });

  // // Read data invoice
  // .get(isLoggedIn, async function (req, res) {
  //   try {
  //     let params = [];

  //     const sortBy = req.query.columns[req.query.order[0].column].data;
  //     const sortMode = req.query.order[0].dir;

  //     fromPurchases = `SELECT purchaseitems.id, purchaseitems.invoice, purchaseitems.itemcode, goods.name, purchaseitems.quantity, purchaseitems.purchaseprice, purchaseitems.totalprice FROM purchaseitems LEFT OUTER JOIN goods ON purchaseitems.itemcode = goods.barcode;`;

  //     const data = await db.query(fromPurchases);

  //     const response = {
  //       draw: Number(req.query.draw),
  //       data: data.rows,
  //       info: req.flash(`info`),
  //     };

  //     res.json(response);
  //   } catch (error) {
  //     res.json(error);
  //   }
  // })

  return router;
};
