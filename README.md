# Odoo Inventory Excel Template Maker

A static web app that converts a product spreadsheet into an **Odoo 19 product import file**. Excel parsing and conversion run on the user's device. Product data is never uploaded to a server.

**Website:** https://heed725.github.io/Odoo-Inventory-Excel-Template-Maker/

## Use

1. Upload `.xlsx`, `.xls`, `.csv`, `.tsv`, or `.ods` (up to 20 MB, 50,000 data rows, 250 columns).
2. Select the worksheet. The app detects common header rows automatically; adjust the header row if needed.
3. Review automatic column matches. It recognizes Odoo field names, common English and Swahili headings, compact headings such as `ProductName`, currency labels such as `Selling Price (TZS)`, and close spelling variations. Spelling-based suggestions are marked for review. Unclear headings remain skipped. **Auto-map columns** reapplies the automatic matches to every column, replacing manual selections. Skip unused columns and set optional company, product category, unit, product type, and POS defaults.
4. Review validation and the output preview.
5. Download `.xlsx` or `.csv`, optionally split into 100, 200, 500, or 1,000 product batches in a ZIP.
6. In Odoo, open **Inventory → Products → Products → Import records**. Review the field matches, click **Test**, then **Import**.

Use **Try a sample product list** to explore, or **Download blank template** to start fresh.

## Supported product fields

Name, Internal Reference, Barcode, Sales Price, Cost, Product Category, Unit of Measure, Packagings, Product Type, Track Inventory, Sales, Purchase, Available in POS, Point of Sale Categories, Company, External ID, Sales Description, Weight, and Volume. Category, company, unit, and POS categories also support External ID relation fields.

Technical field names are used in exports so they do not depend on Odoo's display language. Odoo 19 uses `type=consu` for Goods and a separate `is_storable` field for inventory tracking. The app normalizes Goods and Service labels, numeric prices, and common boolean values.

## Import behavior

- **Existing products:** map and preserve their Odoo External IDs. A name, barcode or SKU alone does not tell Odoo to update an existing record.
- **New products:** optional External ID generation uses a reversible encoding of the internal reference. The same reference always generates the same ID. Keep references unchanged on subsequent imports and retain your original import files.
- Duplicate External IDs and barcodes, duplicate field mappings, missing names, invalid numbers and boolean values block download. Duplicate internal references show a warning because Odoo permits them.
- Existing categories, companies, POS categories, and units must be available in the target database. Ambiguous names should use relation External IDs. Comma-separated POS category names are passed to Odoo as a many-to-many relation.
- Optional defaults fill blank values. Completely empty output columns are omitted to avoid clearing unrelated fields during updates. The converter is intended for product creation and updates that include names, rather than deliberately clearing field values.
- Stock counts require a separate inventory adjustment import. Product variants, taxes, attributes, custom modules and opening stock are outside the built-in template.
- Codes/barcodes should be stored as **text in the source workbook**. Formatting is preserved where available, but digits already lost by Excel (for example numeric identifiers beyond 15 digits) cannot be recovered. Numeric values use a dot for decimals and may use a comma for thousands. Convert decimal-comma source values before importing.
- XLSX exports contain literal cell values, never executable formulas. CSV exports prefix formula-like strings with an apostrophe; use XLSX for identifiers beginning with those characters, or to retain leading zeros when opening a file in Excel.
- Local checks cannot verify installed Odoo apps, permissions, relation records, translated values, or database-specific requirements. Always run Odoo's **Test** before import.

## GitHub Pages

The included workflow tests and deploys the app on every push to `main`.

For initial setup, open **Settings → Pages → Build and deployment → Source → GitHub Actions**, then run **Test and deploy GitHub Pages** from the Actions tab if needed. Subsequent updates deploy automatically.

## Development

No package installation or build step is required. Serve this folder through any static web server. Run conversion and XLSX round-trip checks with:

```sh
npm test
```

Browser assets use relative URLs, including deployment under a GitHub Pages repository path. No API keys or Odoo credentials are required.

## Dependencies and privacy

- Vendored **SheetJS CE 0.20.3** (Apache-2.0) for spreadsheet reading and writing.
- Vendored **JSZip 3.10.1** (MIT) for batch ZIP downloads.
- Google Fonts provides DM Sans and Manrope, with system fallbacks; this font request does not contain product data.
- No analytics, cookies, file storage, or Odoo connection.

Odoo field behavior: [Odoo 19 import/export documentation](https://www.odoo.com/documentation/19.0/applications/general/export_import_data.html) and the [Odoo 19 source](https://github.com/odoo/odoo/tree/19.0).

Created for Hemed Lungo. Independent project, not affiliated with Odoo.
