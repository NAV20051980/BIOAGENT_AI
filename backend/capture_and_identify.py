"""
BioAgent AI — capture_and_identify.py
Quick standalone test: opens your laptop webcam, press SPACE to snap a photo,
runs it straight through the local plant_id.py classifier. No server needed —
useful for testing the CV pipeline against a live camera before wiring it
into the dashboard.

Usage:
    python capture_and_identify.py

Controls:
    SPACE  -> capture current frame and classify it
    ESC    -> quit
"""

import json
import cv2

from plant_id import identify_plant_from_bytes


def main():
    cam = cv2.VideoCapture(0)  # 0 = default webcam
    if not cam.isOpened():
        print("Could not open webcam (index 0). Try changing to 1 if you have multiple cameras.")
        return

    print("Press SPACE to capture and identify, ESC to quit.")

    while True:
        ok, frame = cam.read()
        if not ok:
            print("Failed to read from webcam.")
            break

        cv2.imshow("BioAgent AI - Plant Camera (SPACE=capture, ESC=quit)", frame)
        key = cv2.waitKey(1) & 0xFF

        if key == 27:  # ESC
            break

        elif key == 32:  # SPACE
            ok, buffer = cv2.imencode(".jpg", frame)
            if not ok:
                print("Failed to encode frame.")
                continue
            image_bytes = buffer.tobytes()

            print("\nClassifying...")
            result = identify_plant_from_bytes(image_bytes)
            print(json.dumps(result, indent=2))

    cam.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
