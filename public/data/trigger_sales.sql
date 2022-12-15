-- SALES
-- update good's stock when item added on SALES

CREATE OR REPLACE FUNCTION update_stockOnSale() RETURNS TRIGGER as $set_stockOnSaleItems$
    DECLARE
    old_stock INTEGER;
    total_price NUMERIC;
    current_invoice VARCHAR(20);

    BEGIN 
    -- update goods's stock when item added on sales invoice
        IF (TG_OP = 'INSERT') THEN
            SELECT stock INTO old_stock FROM goods WHERE barcode = NEW.itemcode;
            UPDATE goods SET stock = old_stock - NEW.quantity WHERE barcode = NEW.itemcode;
            current_invoice = NEW.invoice;

    -- update goods's stock when item quantity updated on sales invoice
        ELSIF (TG_OP = 'UPDATE') THEN
            SELECT stock INTO old_stock FROM goods WHERE barcode = NEW.itemcode;
            UPDATE goods SET stock = old_stock + OLD.quantity - NEW.quantity WHERE barcode = NEW.itemcode;
            current_invoice = NEW.invoice;

    -- update goods when item deleted from sales invoice
        ELSIF (TG_OP = 'DELETE') THEN
            SELECT stock INTO old_stock FROM goods WHERE barcode = OLD.itemcode;
            UPDATE goods SET stock = old_stock + OLD.quantity WHERE barcode = OLD.itemcode;
            current_invoice = OLD.invoice;

        END IF;
    -- update sales after endif condition
    SELECT coalesce(sum(totalprice),0) INTO total_price FROM saleitems WHERE invoice = current_invoice;
    UPDATE sales SET totalsum = total_price WHERE invoice = current_invoice;

    RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$set_stockOnSaleItems$ LANGUAGE plpgsql;

CREATE TRIGGER set_stockOnSaleItems
AFTER INSERT OR UPDATE OR DELETE on saleitems
    FOR EACH ROW EXECUTE FUNCTION update_stockOnSale();

-- update total price on Sale
CREATE OR REPLACE FUNCTION update_priceOnSale() RETURNS TRIGGER AS $set_totalPrice_onSale$
    DECLARE
        sale_price NUMERIC;
    BEGIN
        SELECT sellingprice INTO sale_price FROM goods WHERE barcode = NEW.itemcode;
        NEW.sellingprice := sale_price;
        NEW.totalprice := NEW.quantity * sale_price;
        RETURN NEW;
    END
$set_totalPrice_onSale$ LANGUAGE plpgsql;

CREATE TRIGGER set_totalPrice_onSale
BEFORE INSERT OR UPDATE ON saleitems
    FOR EACH ROW EXECUTE FUNCTION update_priceOnSale();

-- generate invoice on Sales

CREATE OR REPLACE FUNCTION sales_invoice() RETURNS text AS $$
 
    BEGIN
	IF EXISTS(SELECT invoice FROM sales WHERE invoice = 'INV-PENJ-' || to_char(CURRENT_DATE, 'YYYYMMDD') || - 1) THEN
		return 'INV-PENJ-' || to_char(CURRENT_DATE, 'YYYYMMDD') || - nextval('sales_invoice_seq');
	ELSE
		ALTER SEQUENCE sales_invoice_seq RESTART WITH 1;
		return 'INV-PENJ-' || to_char(CURRENT_DATE, 'YYYYMMDD') || - nextval('sales_invoice_seq');
	END IF;
END;

$$ LANGUAGE plpgsql;