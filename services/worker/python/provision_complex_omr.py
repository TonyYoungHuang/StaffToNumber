"""Explicit administrator provisioning; never invoked by paid recognition jobs.

Default is offline verification. --download explicitly permits model downloads.
Run with the configured CPU Python environment after installing homr[cpu].
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import subprocess
import sys

COMMIT = "33baa326900faa12702df8c4bdcbea034a3d6a34"
MODEL_SHA256 = {
    "segnet_308-3296ccd40960f90ca6ab9c035cca945675d30a0f.onnx": "6ed36640db4ef5d223098b6d5efe4eda97c66b24a2c72faab8a018c749003a8d",
    "encoder_pytorch_model_465-597144cab54c8f6d0f6c9619df5c5312694eadd6.onnx": "92bd18338dc8da3c9b00185008ab14719ff9f912efe785ca42d7b623e06e0c6b",
    "decoder_pytorch_model_465-597144cab54c8f6d0f6c9619df5c5312694eadd6.onnx": "18801c1e3657bdea1b031db90b10d66e15accfc1d607780f09a9e059133e886a",
    "ch_ppocr_mobile_v2.0_cls_mobile.onnx": "e47acedf663230f8863ff1ab0e64dd2d82b838fceb5957146dab185a89d6215c",
    "PP-OCRv6_det_small.onnx": "090f04abcd9d9a7498bc4ebf677e4cb9bdce1fe4197ddb7e529f1ef44e1ff94f",
    "PP-OCRv6_rec_small.onnx": "6f327246b50388f3c176ae304bd95767ea6dc0c9ae92153ef8cbe210b3c14884",
}


def sha256(filename):
    digest = hashlib.sha256()
    with filename.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify_source(source):
    if (source / ".git").exists():
        actual = subprocess.run(["git", "-C", str(source), "rev-parse", "HEAD"], check=True, capture_output=True, text=True).stdout.strip()
    elif (source / "SOURCE_COMMIT").is_file():
        actual = (source / "SOURCE_COMMIT").read_text(encoding="utf-8").strip()
    else:
        raise RuntimeError("Pinned homr requires its Git checkout or a SOURCE_COMMIT provenance marker")
    if actual != COMMIT:
        raise RuntimeError(f"Unexpected homr source commit: {actual}")
    if not (source / "LICENSE").is_file():
        raise RuntimeError("Upstream homr LICENSE must accompany the source")


def provision(source, allow_download=False):
    verify_source(source)
    sys.path.insert(0, str(source))
    os.environ.setdefault("OMP_NUM_THREADS", "1")
    os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
    import onnxruntime
    import rapidocr
    from homr.main import download_weights
    from homr.segmentation.config import segnet_path_onnx
    from homr.transformer.configs import default_config
    model_dir = Path(rapidocr.__file__).parent / "models"
    files = [Path(segnet_path_onnx), Path(default_config.filepaths.encoder_path), Path(default_config.filepaths.decoder_path)]
    files += [model_dir / name for name in ("PP-OCRv6_det_small.onnx", "ch_ppocr_mobile_v2.0_cls_mobile.onnx", "PP-OCRv6_rec_small.onnx")]
    if allow_download:
        download_weights(False, False, False)
        # Only this explicit initialization may resolve RapidOCR downloads.
        from homr.title_detection import download_ocr_weights
        download_ocr_weights()
    manifest = []
    for filename in files:
        if not filename.is_file():
            raise RuntimeError(f"Required offline model is missing: {filename.name}; explicitly provision with --download first")
        checksum = sha256(filename)
        if checksum != MODEL_SHA256[filename.name]:
            raise RuntimeError(f"Model checksum mismatch: {filename.name}")
        manifest.append({"name": filename.name, "bytes": filename.stat().st_size, "sha256": checksum})
    if "CPUExecutionProvider" not in onnxruntime.get_available_providers():
        raise RuntimeError("ONNX CPU execution provider is unavailable")
    return {"schemaVersion": 1, "homrCommit": COMMIT, "provider": "CPUExecutionProvider", "models": manifest,
            "versions": {name: importlib.metadata.version(name) for name in ("numpy", "opencv-python-headless", "Pillow", "onnxruntime", "rapidocr", "pypdfium2")}}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", required=True)
    parser.add_argument("--download", action="store_true", help="Explicitly provision missing upstream weights before enabling paid jobs")
    parser.add_argument("--manifest", required=True)
    args = parser.parse_args()
    manifest = provision(Path(args.source_dir).resolve(), args.download)
    output = Path(args.manifest)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Complex OMR offline readiness verified: {len(manifest['models'])} pinned models; {output}")


if __name__ == "__main__":
    main()
