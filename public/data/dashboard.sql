-- VIEW QUERY FOR DATATABLE
CREATE VIEW pos_monthly_report AS
SELECT
    coalesce(sum(sales.totalsum), 0) AS revenue,
    coalesce(sum(purchases.totalsum), 0) AS expense,
    coalesce(sum(sales.totalsum), 0) - coalesce(sum(purchases.totalsum), 0) AS earnings,
    coalesce(
        to_char(purchases.time, 'Mon YY'),
        to_char(sales.time, 'Mon YY')
    ) AS monthly
FROM
    sales FULL
    OUTER JOIN purchases ON sales.time = purchases.time
GROUP BY
    monthly
ORDER BY
    monthly 

-- TEST QUERY FOR DATATABLE
SELECT
    *
FROM
    pos_monthly_report
ORDER BY
    monthly DESC
LIMIT
    3 OFFSET 0 

-- QUERY FOR CHART AND CUSTOMER
SELECT
    coalesce(sum(sales.totalsum), 0) - coalesce(sum(purchases.totalsum), 0) AS earnings,
    sum(
        CASE
            WHEN sales.customer = 1 THEN 1
            ELSE 0
        END
    ) AS direct,
    sum(
        CASE
            WHEN sales.customer = 2 THEN 1
            ELSE 0
        END
    ) AS customer,
    coalesce(
        to_char(sales.time, 'Mon YY'),
        to_char(purchases.time, 'Mon YY')
    ) AS date
FROM
    sales FULL
    OUTER JOIN purchases ON sales.time = purchases.time
    LEFT JOIN customers ON customers.customerid = sales.customer
GROUP BY
    date
ORDER BY
    date DESC
-- WHERE
    -- coalesce(
    --     to_char(purchases.time, 'YYYY-MM-DD'),
    --     to_char(sales.time, 'YYYY-MM-DD')
    -- ) BETWEEN '2022-11-05'
--     AND '2022-12-07'
