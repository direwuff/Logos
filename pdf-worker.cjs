const fs = require("fs");

async function main() {
  let input = "";

  process.stdin.setEncoding("utf8");

  for await (const chunk of process.stdin) {
    input += chunk;
  }

  const request = JSON.parse(input);

  if (!request.path) {
    throw new Error("Missing PDF path");
  }

  if (!fs.existsSync(request.path)) {
    throw new Error(
      `PDF does not exist: ${request.path}`
    );
  }

  const pdfjs = await import(
    "pdfjs-dist/legacy/build/pdf.mjs"
  );

  const buffer =
    fs.readFileSync(request.path);

  const loadingTask =
    pdfjs.getDocument({
      data: new Uint8Array(buffer)
    });

  const pdf =
    await loadingTask.promise;

  const pages = [];

  for (
    let pageNumber = 1;
    pageNumber <= pdf.numPages;
    pageNumber++
  ) {
    const page =
      await pdf.getPage(pageNumber);

    const content =
      await page.getTextContent();

    const text =
      content.items
        .map(item =>
          typeof item.str === "string"
            ? item.str
            : ""
        )
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

    if (text) {
      pages.push({
        page: pageNumber,
        text
      });
    }
  }

  process.stdout.write(
    JSON.stringify({
      success: true,
      pageCount: pdf.numPages,
      text: pages
        .map(page => page.text)
        .join("\n\n"),
      pages
    })
  );
}

main().catch(error => {
  process.stderr.write(
    String(
      error && error.stack
        ? error.stack
        : error
    )
  );

  process.exit(1);
});
