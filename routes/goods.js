var express = require("express");
var router = express.Router();
const path = require("path");
const { isAdmin } = require("../helpers/util");

module.exports = function (db) {
  let sql;
  let response;

  router
    .route("/")
    // Route to goods page
    .get(isAdmin, async function (req, res) {
      try {
        res.render("./goods/goods", {
          user: req.session.user,
          success: req.flash(`success`),
          error: req.flash(`error`),
          active: `goods`,
        });
      } catch (error) {
        res.json(error);
      }
    });

  router
    .route("/add")
    // Render add goods page
    .get(isAdmin, async function (req, res) {
      try {
        const { rows: getUnit } = await db.query(
          `SELECT * from units ORDER BY "unit" ASC`
        );

        res.render("./goods/add", {
          user: req.session.user,
          unit: getUnit,
          active: `goods/add`,
        });
      } catch (error) {
        res.json(error);
      }
    })
    // Save the newly added goods
    .post(isAdmin, async function (req, res) {
      try {
        let picture;
        let pictureName;

        const { barcode, name, stock, purchasePrice, sellingPrice, unit } =
          req.body;

          // if No picture
        if (!req.files || Object.keys(req.files).length === 0) {
          // /* Driver code to update data */
          sql = `INSERT INTO goods("barcode", "name", "stock", "unit", "purchaseprice", "sellingprice", "picture") VALUES($1,$2,$3,$4,$5,$6,$7) returning *`;
          pictureName = `no-picture`
          
          response = [
            barcode,
            name,
            stock,
            unit,
            purchasePrice,
            sellingPrice,
            pictureName
          ];

          const { rows: addGoodsNoPicture } = await db.query(sql, response);
          
          if (addGoodsNoPicture.length > 0) {
            req.flash(`success`, `A new goods ${name} has been added!`);
          } else {
            req.flash(`error`, `Error when adding ${name}!`);
          }
          return res.redirect("/goods");
        }

        /* Driver Code for picture upload */
        // The name of the input field (i.e. "picture") is used to retrieve the uploaded file
        picture = req.files.picture;
        pictureName = `${Date.now()}-${picture.name}`;

        let uploadPath = path.join(
          __dirname,
          "..",
          "public",
          "images",
          "goods",
          pictureName
        );

        // /* Driver code to add data */
        sql = `INSERT INTO goods("barcode", "name", "stock", "unit", "purchaseprice", "sellingprice", "picture") VALUES($1,$2,$3,$4,$5,$6,$7) returning *`;

        response = [
          barcode,
          name,
          stock,
          unit,
          purchasePrice,
          sellingPrice,
          pictureName,
        ];

        const { rows: addGoods } = await db.query(sql, response);
        await picture.mv(uploadPath);

        if (addGoods.length > 0) {
          req.flash(`success`, `A new goods ${name} has been added!`);
        } else {
          req.flash(`error`, `Error when adding a new goods!`);
        }

        res.redirect("/goods");
      } catch (error) {
        res.json(error);
      }
    });

  router
    .route("/data")
    // Populate goods table
    .get(isAdmin, async function (req, res) {
      try {
        let params = [];

        if (req.query.search.value) {
          params.push(`barcode LIKE '%${req.query.search.value}%'`);
          params.push(`name ILIKE '%${req.query.search.value}%'`);
        }

        const limit = req.query.length;
        const offset = req.query.start;
        const sortBy = req.query.columns[req.query.order[0].column].data;
        const sortMode = req.query.order[0].dir;

        let queryTotal = `SELECT count(*) as TOTAL FROM goods${
          params.length > 0 ? ` WHERE ${params.join(" OR ")}` : ""
        }`;
        let queryData = `SELECT * FROM goods${
          params.length > 0 ? ` WHERE ${params.join(" OR ")}` : ""
        } ORDER BY ${sortBy} ${sortMode} LIMIT ${limit} OFFSET ${offset}`;

        const total = await db.query(queryTotal);
        const data = await db.query(queryData);

        const response = {
          draw: Number(req.query.draw),
          recordsTotal: total.rows[0].total,
          recordsFiltered: total.rows[0].total,
          data: data.rows,
        };

        res.json(response);
      } catch (error) {
        res.json(error);
      }
    });

  router
    .route("/data/check")
    // Notification - check for goods low in stock
    .get(isAdmin, async function (req, res) {
      try {
        sql = `SELECT barcode, name, stock FROM goods where stock <= 5`;

        const { rows: getAlertData } = await db.query(sql);

        res.json({
          data: getAlertData,
        });
      } catch (error) {
        res.json(error);
      }
    });

  router
    .route("/data/:barcode")
    // Render edit goods page
    .get(isAdmin, async function (req, res) {
      try {
        sql = `SELECT * FROM goods WHERE "barcode" = $1`;

        const { barcode } = req.params;

        const { rows: findGoods } = await db.query(sql, [barcode]);
        const { rows: getUnits } = await db.query(
          `SELECT * from units ORDER BY "unit" ASC`
        );

        res.render("./goods/edit", {
          user: req.session.user,
          data: findGoods,
          unit: getUnits,
          active: `goods/edit`,
        });
      } catch (error) {
        res.json(error);
      }
    })
    // Save updated goods
    .post(isAdmin, async function (req, res) {
      try {
        let picture;
        let pictureName;

        const { barcode, name, stock, purchasePrice, sellingPrice, unit } =
          req.body;

        if (!req.files || Object.keys(req.files).length === 0) {
          // /* Driver code to update data */
          sql = `UPDATE goods SET "barcode" = $1, "name" = $2, "stock" = $3, "purchaseprice" = $4, "sellingprice" = $5, "unit" = $6 WHERE "barcode" = $7 returning *`;

          response = [
            barcode,
            name,
            stock,
            purchasePrice,
            sellingPrice,
            unit,
            barcode,
          ];

          const { rows: updateGoodsNoPicture } = await db.query(sql, response);

          if (updateGoodsNoPicture.length > 0) {
            req.flash(`success`, `${name} has been updated!`);
          } else {
            req.flash(`error`, `Error when updating ${name}!`);
          }
          return res.redirect("/goods");
        }

        /* Driver Code for picture upload */
        // The name of the input field (i.e. "picture") is used to retrieve the uploaded file
        picture = req.files.picture;
        pictureName = `${Date.now()}-${picture.name}`;

        let uploadPath = path.join(
          __dirname,
          "..",
          "public",
          "images",
          "goods",
          pictureName
        );

        response = [
          barcode,
          name,
          stock,
          purchasePrice,
          sellingPrice,
          unit,
          pictureName,
          barcode,
        ];

        // /* Driver code to update data */
        sql = `UPDATE goods SET "barcode" = $1, "name" = $2, "stock" = $3, "purchaseprice" = $4, "sellingprice" = $5, "unit" = $6, "picture" = $7 WHERE "barcode" = $8 returning *`;

        const { rows: updateGoods } = await db.query(sql, response);
        await picture.mv(uploadPath);

        if (updateGoods.length > 0) {
          req.flash(`success`, `${name} has been updated!`);
        } else {
          req.flash(`error`, `Error when updating ${name}!`);
        }

        res.redirect("/goods");
      } catch (error) {
        res.json(error);
      }
    })
    // 5. Delete a goods
    .delete(isAdmin, async function (req, res) {
      try {
        sql = `DELETE FROM goods WHERE "barcode" = $1`;
        const barcode = req.params.barcode;
        const deleteData = await db.query(sql, [barcode]);
        res.json(deleteData);
      } catch (error) {
        res.json(error);
      }
    });

  return router;
};
