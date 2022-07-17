
import os
import numpy as np
import cv2

directory = './items/'

#Script to scale all items in items dir to 128 x 128
# USE WITH CAUTION
exit()
for filename in os.listdir(directory):
    f = os.path.join(directory, filename)
    if os.path.isfile(f):
        img = cv2.imread(f, cv2.IMREAD_UNCHANGED)
        scaled = cv2.resize(img, (128, 128))
        cv2.imwrite(f, scaled)
