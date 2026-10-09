"""Loads config/cell.yaml and the URDF joint limits. No ROS imports, so it is easy to test."""
import os
import xml.etree.ElementTree as ET

import yaml

CONFIG_PATH = os.environ.get("CELL_CONFIG", "/config/cell.yaml")


def load_config(path=CONFIG_PATH):
    with open(path, "r", encoding="utf-8") as handle:
        cfg = yaml.safe_load(handle)
    if os.environ.get("NO_CAMERA") == "1":
        cfg["camera"]["force_synthetic"] = True
    return cfg


def load_joint_limits(urdf_path):
    """Returns [(name, lower, upper), ...] for all revolute joints, in URDF order."""
    root = ET.parse(urdf_path).getroot()
    limits = []
    for joint in root.findall("joint"):
        if joint.get("type") != "revolute":
            continue
        limit = joint.find("limit")
        limits.append((joint.get("name"), float(limit.get("lower")), float(limit.get("upper"))))
    return limits


def public_config(cfg):
    """The subset of the config the browser needs (served as /api/config.json)."""
    return {
        "calibration": cfg["calibration"],
        "conveyor": cfg["conveyor"],
        "robot": {"home_pose": cfg["robot"]["home_pose"]},
        "camera": {"fps": cfg["camera"]["fps"]},
    }
