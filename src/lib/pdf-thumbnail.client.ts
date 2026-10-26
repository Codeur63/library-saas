export async function generatePdfThumbnail(
  file: File,
  width = 480
): Promise<Blob | null> {
  let pdf:
    | Awaited<ReturnType<
        typeof import("pdfjs-dist/legacy/build/pdf.mjs")["getDocument"]
      >["promise"]>
    | undefined;

  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

    pdfjs.GlobalWorkerOptions.workerSrc =
      new URL(
        "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();

    const buffer = await file.arrayBuffer();

    pdf = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      isEvalSupported: false,
    }).promise;

    const page = await pdf.getPage(1);

    const baseViewport = page.getViewport({ scale: 1 });

    const scale = width / baseViewport.width;

    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    const context = canvas.getContext("2d");

    if (!context) {
      return null;
    }

    context.fillStyle = "#ffffff";
    context.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );
 
    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });
  } catch (error) {
    console.error(
      "Impossible de générer la couverture PDF",
      error
    );

    return null;
  } finally {
    await pdf?.destroy();
  }
}