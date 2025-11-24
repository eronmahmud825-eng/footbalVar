import cv2
import numpy as np
import time

# -------------------------
# Camera Setup
# -------------------------
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("Error: Camera not found")
    exit()

frame_width = 640
frame_height = 480
cap.set(3, frame_width)
cap.set(4, frame_height)

# -------------------------
# Goal Area (pixels)
# -------------------------
goal_area_top_left = (200, 100)
goal_area_bottom_right = (440, 300)

# -------------------------
# Scoreboard
# -------------------------
score_team1 = 0
score_team2 = 0

# -------------------------
# Ball detection (white ball)
# Adjusted HSV for real-world white balls
# -------------------------
lower_white = np.array([0, 0, 150])
upper_white = np.array([180, 80, 255])

# -------------------------
# Handball detection area (upper half)
# -------------------------
hand_area_top = 50
hand_area_bottom = 200

# -------------------------
# VAR freeze-frame
# -------------------------
freeze_frame = None
freeze_timer = 0

# -------------------------
# Helper Functions
# -------------------------
def inside_goal(x, y):
    return (goal_area_top_left[0] < x < goal_area_bottom_right[0] and
            goal_area_top_left[1] < y < goal_area_bottom_right[1])

def check_handball(x, y):
    return hand_area_top < y < hand_area_bottom

# -------------------------
# Main Loop
# -------------------------
while True:
    ret, frame = cap.read()
    if not ret:
        break

    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, lower_white, upper_white)
    contours, _ = cv2.findContours(mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    # Draw goal area
    cv2.rectangle(frame, goal_area_top_left, goal_area_bottom_right, (0,255,0), 2)

    # Default event text
    event_text = "Waiting for ball..."

    # Detect ball
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area > 200:  # smaller minimum to detect small balls
            x, y, w, h = cv2.boundingRect(cnt)
            cx = x + w // 2
            cy = y + h // 2

            # Draw ball
            cv2.circle(frame, (cx, cy), 10, (0,0,255), -1)
            cv2.putText(frame, "BALL", (cx+10, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,0,255), 2)

            # Goal detection
            if inside_goal(cx, cy):
                event_text = "GOAL !!!"
                score_team1 += 1
                freeze_frame = frame.copy()
                freeze_timer = time.time()
                cv2.putText(frame, "PLAYER 1 SCORED!", (50, frame_height-50),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0,255,0), 3)

            # Handball detection
            elif check_handball(cx, cy):
                event_text = "HAND BALL!"
                freeze_frame = frame.copy()
                freeze_timer = time.time()
                cv2.putText(frame, "HAND BALL!", (50, frame_height-50),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0,0,255), 3)

    # Display scoreboard
    cv2.putText(frame, f"Player1: {score_team1} | Player2: {score_team2}",
                (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (255,255,0), 2)

    # VAR freeze-frame effect for 2 seconds
    if freeze_frame is not None and time.time() - freeze_timer < 2:
        alpha = 0.7
        frame = cv2.addWeighted(freeze_frame, alpha, frame, 1-alpha, 0)

    # Show event text
    cv2.putText(frame, event_text, (20, frame_height-20), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0,255,255), 3)

    # Show mask window (optional for debugging)
    # cv2.imshow("Mask", mask)

    # Display frame
    cv2.imshow("AI Football VAR System", frame)

    # Quit on 'q'
    key = cv2.waitKey(1)
    if key == ord('q'):
        break

# Release camera
cap.release()
cv2.destroyAllWindows()
