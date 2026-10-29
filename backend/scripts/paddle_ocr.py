import sys
import json
import contextlib

try:
    from paddleocr import PaddleOCR
except Exception as exc:
    print(json.dumps({"success": False, "error": f"PaddleOCR import failed: {exc}"}))
    sys.exit(1)

def collect_text(value, output):
    if isinstance(value, dict):
        rec_texts = value.get("rec_texts")
        if isinstance(rec_texts, list):
            output.extend(str(text) for text in rec_texts if str(text).strip())

        markdown = value.get("markdown") or value.get("md_content")
        if isinstance(markdown, str) and markdown.strip():
            output.append(markdown)

        for child in value.values():
            collect_text(child, output)
    elif isinstance(value, list):
        for child in value:
            collect_text(child, output)

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No file path provided."}))
        sys.exit(1)

    file_path = sys.argv[1]

    try:
        with contextlib.redirect_stdout(sys.stderr):
            ocr = PaddleOCR(
                lang="en",
                ocr_version="PP-OCRv4",
                use_doc_orientation_classify=False,
                use_doc_unwarping=False,
                use_textline_orientation=False,
            )
            result = ocr.predict(file_path)

        extracted_text = []
        collect_text(result, extracted_text)

        text = "\n".join(dict.fromkeys(extracted_text))

        print(json.dumps({
            "success": True,
            "text": text
        }))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
