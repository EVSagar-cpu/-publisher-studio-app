# Publisher Studio

Standalone static app for turning messy chapter documents into print-ready textbook layouts.

## What it does

- Import `DOCX`, `PDF`, `TXT`, or Markdown lesson files
- Upload fallback lesson images separately
- Build a textbook template with editable layout blocks
- Configure page size, orientation, and margins
- Print directly from the browser
- Export PDF
- Export a Word-compatible `.doc`
- Save the layout definition as JSON

## Commands

```bash
npm install
npm run dev
npm run build
```

## Notes

- No database is used
- Draft state is stored in browser `localStorage`
- If a PDF has poor extraction, upload the source images separately
