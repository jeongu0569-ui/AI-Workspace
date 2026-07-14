# Platform-Neutral PDF Annotations

Codmes PDF annotation state is intentionally stored outside any one UI toolkit.
Apple clients may use PDFKit and PencilKit, but the saved workspace state must
remain usable by future Windows and Android/Galaxy Tab clients.

## State Location

For a PDF file:

```text
Notes/mypage.pdf
```

Codmes stores editable annotation state next to the document folder:

```text
Notes/.codmes/annotations/mypage.codmes.json
```

This keeps the PDF visible in normal file lists while letting a folder move or
copy carry its editable notes with it.

## Ink Strokes

The shared ink format is `PDFAnnotationPage.inkStrokes`.

Each stroke stores:

- `id`: stable stroke id
- `tool`: current tool name, usually `pen`
- `color`: CSS-style color string such as `#111111`
- `width`: logical stroke width
- `opacity`: optional alpha
- `points`: normalized page points

Each point stores:

- `x`: normalized horizontal position from `0` to `1`
- `y`: normalized vertical position from `0` to `1`, measured from the top of
  the page
- `pressure`: optional pointer pressure
- `timeOffset`: optional timestamp relative to stroke start

iOS/iPadOS currently stores legacy `inkDataBase64` for PencilKit compatibility
and also writes `inkStrokes`. New non-Apple clients should treat `inkStrokes` as
the canonical portable path.

## Text And Image Objects

Text boxes and attached images use `PDFAnnotationObject`.

Important fields:

- `id`: stable object id
- `type`: `text` or `image`
- `pageIndex`: zero-based PDF page
- `bbox`: normalized page-relative rectangle
- `text`: searchable text for text objects
- `dataBase64`: embedded image payload for image objects
- `metadata`: optional font size, color, mime type, file name, or UI hints

`bbox` uses top-left normalized coordinates:

```json
{
  "x": 0.2,
  "y": 0.2,
  "width": 0.4,
  "height": 0.1
}
```

## Current Client Support

Current Apple support:

- iOS/iPadOS: PencilKit pen, eraser, lasso, text boxes, image objects,
  move/resize/delete, pen color selection, export/import.
- macOS: PDFKit preview, pen input, stroke erasing, text/image object
  selection, object move/resize, text editing, inspector controls, pen color
  selection, colored ink preview, and Delete-key object removal.
- iOS/iPadOS also renders non-PencilKit `inkStrokes` in a separate preview
  layer. This makes macOS-created strokes visible on iPhone/iPad even when a
  page does not have PencilKit `inkDataBase64`.
- Text boxes are placed by selecting the text tool and tapping the target page
  location. The first tap selects an existing text box and shows an inline
  delete affordance; tapping the selected text box again opens text editing.
- On compact iPhone layouts, the PDF screen starts in Read mode so finger
  gestures scroll and zoom the PDF normally. Edit mode explicitly enables the
  annotation overlay for pen, lasso, object selection, text placement, and image
  attachment. Regular-width iPad layouts start in Edit mode because Pencil input
  is the expected primary workflow.

Still planned:

- Windows and Android/Galaxy Tab render/edit adapters.
- PDF standard annotation round-trip.
- More advanced layer, shape, sticker, and object-inspector controls.

## Windows And Android Adapter Contract

A future Windows or Android client should:

1. Load the PDF through the platform-native PDF viewer.
2. Load the matching `.codmes/annotations/*.codmes.json` file through the
   Codmes Server API.
3. Render each `inkStrokes` point list over the page using normalized page
   coordinates.
4. Render each `PDFAnnotationObject` using its normalized `bbox`.
5. Save edits back to the same JSON model, not to a platform-specific binary
   drawing format.
6. Keep expensive OCR/embedding work on the server side after the annotation
   JSON is saved.

This keeps GoodNotes-style editing portable without locking Codmes to
PencilKit, PDFKit, Windows Ink, or Android Canvas as the storage format.
