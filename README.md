# FdtDesktop

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.3.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## File Monitor Regex Rules Examples

This application allows you to set up file monitoring rules with regular expressions to match specific files and automatically copy them to destination folders. Here are some common regex pattern examples:

### Common Regex Pattern Examples

1. **Match specific file extensions**:

   - `\.pdf$` - Matches all PDF files
   - `\.docx?$` - Matches .doc and .docx files
   - `\.(jpg|jpeg|png|gif)$` - Matches common image files

2. **Match files with specific naming patterns**:

   - `^invoice_.*\.pdf$` - Matches PDF files starting with "invoice\_"
   - `.*_report_\d{4}-\d{2}-\d{2}\.xlsx$` - Matches Excel files ending with "_report_" followed by a date (YYYY-MM-DD)
   - `^[A-Z]{2}\d{6}.*\.csv$` - Matches CSV files starting with 2 uppercase letters followed by 6 digits

3. **Match files by date patterns in filenames**:
   - `.*\d{4}-\d{2}-\d{2}.*` - Matches files containing a date in YYYY-MM-DD format
   - `.*\(\d{2}-\d{2}\)\.pdf$` - Matches PDF files ending with a date in (MM-DD) format

### How to Use Regex Rules in the Application

1. Enter the source directory where files will be monitored
2. Enter the destination directory where matching files will be copied
3. Enter a regex pattern that will be used to match filenames
4. Add the rule and start monitoring

Remember to escape special characters with a backslash (\\) in your regex patterns.

### Example Workflow

For a typical use case where you want to monitor a downloads folder and automatically copy new PDF invoices to an accounting folder:

- Source: `C:\Users\YourName\Downloads`
- Destination: `C:\Users\YourName\Documents\Accounting\Invoices`
- Pattern: `^invoice.*\.pdf$`
