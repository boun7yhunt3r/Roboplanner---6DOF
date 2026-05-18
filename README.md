# Roboplanner---6DOF
Interactive 6-DOF robot arm path planner for researchers. React + Three.js frontend, FastAPI + NumPy backend. DH-parameter kinematics, capsule-AABB collision detection, RRT &amp; LERP planners, smooth animated playback — no ROS required.


# RoboPlanner 🤖

> **An interactive 6-DOF robot arm path planning workbench for robotics researchers.**  
> No ROS. No MoveIt. Runs entirely in your browser and on localhost.

[![Python](https://img.shields.io/badge/Python-3.11+-3776ab?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=black)](https://react.dev)
[![Three.js](https://img.shields.io/badge/Three.js-r165-black?logo=threedotjs)](https://threejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

RoboPlanner is a **research-grade, browser-based workcell planner** for 6-axis industrial arms.  
It replaces the slow, ROS-heavy setup loop with a fast, visual, reproducible experiment environment  
that any researcher can run with two terminal commands.

---

## Why RoboPlanner?

| Problem with existing tools | RoboPlanner's answer |
|---|---|
| ROS/MoveIt setup takes hours | Runs with `pip install` + `npm install` |
| Obstacle scenes are hard to reproduce | Scene JSON import/export built-in |
| Goal specification requires raw math | Guided joint-space **or** Cartesian pose editor with live IK |
| Path visualization is cluttered and unclear | Clean 3D scene, bold path line, smooth animated replay |
| Switching planners requires code changes | Toggle between LERP and RRT in the UI |

---

## Features

- **4 built-in robot presets** — UR5, KUKA KR6, ABB IRB1200, Generic 6R
- **DH-parameter kinematics** — exact FK, damped least-squares IK
- **Two planners** — joint-space LERP (fast) and RRT with shortcut smoothing (obstacle-aware)
- **Capsule-AABB collision detection** — per-link capsule vs box/sphere/cylinder primitives
- **3D workcell editor** — add, move, duplicate, and inspect box/sphere/cylinder obstacles
- **Animated path replay** — scrub, play/pause, speed control, TCP trail
- **Path metrics** — Cartesian length, joint-space length, smoothness, min clearance
- **Export** — waypoint CSV, scene JSON
- **Comparison mode** — overlay two planning runs in the same viewport
- **Light + dark theme** — dark by default for long research sessions

---

## Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript, Vite |
| **3D rendering** | Three.js via React Three Fiber + Drei |
| **State** | Zustand |
| **UI** | Tailwind CSS + Radix UI primitives |
| **Backend** | Python 3.11 + FastAPI |
| **Kinematics** | NumPy (custom DH implementation) |
| **Planning** | Custom RRT + LERP (no external planner dependency) |

## Visualization Examples

<table>
  <tr>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/8b22c019-57c6-4e7c-b039-fda00ce22c34" width="280" height="240" alt="Front view — path planning result"/>
      <br/><sub><b>Top View</b></sub>
    </td>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/d94b7d02-5ad7-43cb-9b25-8a38de0d83ee" width="280" height="240" alt="Side view — path planning result"/>
      <br/><sub><b>Front View</b></sub>
    </td>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/537aafe4-7b0d-4a5b-aa19-3e8cd527450a" width="280" height="240" alt="Top view — path planning result"/>
      <br/><sub><b>Side View</b></sub>
    </td>
  </tr>
</table>

<img width="958" height="454" alt="image" src="https://github.com/user-attachments/assets/00832f95-ed45-4aa1-b62b-cee2394e632f" />
<img width="134" height="202" alt="image" src="https://github.com/user-attachments/assets/c469abe6-c80e-4f37-97dd-6fa98778bf63" />
<img width="126" height="140" alt="image" src="https://github.com/user-attachments/assets/9c45d3e5-3045-4016-912b-db23bfbdd865" />





