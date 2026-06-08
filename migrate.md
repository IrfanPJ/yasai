You are a senior Full-Stack Engineer.

Your task is to completely analyze the provided XJS/React project and migrate it into a clean production-ready web application using:

* HTML5
* CSS3
* Vanilla JavaScript (ES6+)
* Supabase
* HTML-to-PDF generation

Do NOT simply convert files line by line.

Refactor and rebuild the project into a clean maintainable structure while preserving all business logic.

⸻

OBJECTIVE

Convert the entire XJS project into a traditional web application.

The final application must:

1. Work without React/XJS.
2. Use only HTML, CSS and JavaScript.
3. Connect to Supabase.
4. Save form submissions.
5. Generate PDFs matching the existing receipt/invoice format.
6. Allow downloading PDFs.
7. Be mobile responsive.
8. Have clean UI/UX.
9. Remove all unnecessary code, dependencies and components.

⸻

PROJECT ANALYSIS REQUIREMENTS

Before coding:

1. Analyze every file.
2. Identify:
    * Form fields
    * Business logic
    * Validation rules
    * PDF generation logic
    * Receipt layout
    * Database fields
    * Logos
    * Images
    * Header information
3. Create a migration plan.
4. Then rebuild from scratch using HTML/CSS/JS.

⸻

FOLDER STRUCTURE

Create:

project/
│
├── index.html
├── css/
│   └── style.css
│
├── js/
│   ├── app.js
│   ├── form.js
│   ├── pdf.js
│   ├── supabase.js
│   └── validation.js
│
├── assets/
│   ├── logo.png
│   ├── images/
│   └── icons/
│
└── templates/
    └── receipt-template.html

⸻

UI REQUIREMENTS

Design must be:

* Professional
* Clean
* Modern
* Fast
* Mobile responsive

Use:

* Proper spacing
* Grid layout
* Form grouping
* Professional typography
* Company branding

Preserve original logos from the XJS project.

If multiple logos exist:

* Extract them
* Optimize them
* Use highest-quality version

⸻

FORM REQUIREMENTS

Recreate all form fields found in the XJS project.

Include:

* Validation
* Required field checking
* Error messages
* Success messages

Do not remove any business-critical field.

Remove:

* Unused fields
* Debug fields
* Temporary fields
* Development-only code

⸻

SUPABASE INTEGRATION

Use Supabase as backend.

Create:

supabase.js

All database operations must be centralized.

Implement:

Save Record

insert()

Update Record

update()

Fetch Record

select()

Delete Record

delete()

Use environment configuration variables:

SUPABASE_URL
SUPABASE_ANON_KEY

Do not hardcode credentials.

⸻

DATABASE REQUIREMENTS

Analyze current project fields and create matching database schema.

Every submitted form must be stored in Supabase.

Store:

* Customer details
* Form values
* Generated receipt number
* Date
* PDF URL (if uploaded)
* Status

⸻

PDF GENERATION REQUIREMENTS

IMPORTANT:

Do NOT generate PDF using canvas screenshots.

Use proper HTML templates.

Preferred:

or

PDF must be generated from:

templates/receipt-template.html

⸻

RECEIPT DESIGN REQUIREMENTS

Analyze the provided receipt/reference image.

Recreate the receipt exactly.

Preserve:

* Layout
* Header
* Company information
* Alignment
* Tables
* Typography hierarchy
* Logo placement
* Signature section
* Footer section

PDF output should be visually identical to the reference.

⸻

HEADER REQUIREMENTS

Use the header information from the original project.

Include:

* Company Logo
* Company Name
* Address
* Phone
* Email
* Website
* Tax Information
* Registration Details

The header should automatically appear in:

1. PDF
2. Print view
3. Preview view

⸻

PDF CONTENT MAPPING

All form fields must automatically populate:

* Customer Name
* Customer Details
* Date
* Invoice Number
* Receipt Number
* Description
* Amounts
* Totals
* Notes
* Signature Areas

Data must be dynamically inserted into the HTML template before PDF generation.

⸻

PDF FEATURES

Include:

Preview

User can preview receipt before download.

Download PDF

One-click download.

Print PDF

Browser print support.

Auto Filename

Example:

Receipt_0001.pdf

⸻

CLEANUP REQUIREMENTS

Remove:

* React
* JSX
* XJS
* Unused Components
* Unused Libraries
* Dead Code
* Duplicate Logic
* Temporary Files
* Test Files

Keep only production-ready code.

⸻

RESPONSIVE REQUIREMENTS

Support:

* Mobile
* Tablet
* Desktop

PDF layout must remain fixed and professional regardless of screen size.

⸻

DELIVERABLES

Provide:

1. Complete HTML files
2. CSS files
3. JavaScript files
4. Supabase integration
5. Database schema
6. Receipt HTML template
7. PDF generation module
8. Installation guide
9. Deployment guide
10. Migration report showing:
    * Original functionality
    * New implementation
    * Removed components
    * Improvements made

⸻

FINAL INSTRUCTION

Do not create placeholders.

Do not omit functionality.

Analyze the uploaded XJS project completely and migrate every required feature into a clean HTML/CSS/JavaScript architecture while preserving the exact receipt/PDF format and integrating Supabase as the primary database backend.

The output should be production-ready and deployable without React or XJS.