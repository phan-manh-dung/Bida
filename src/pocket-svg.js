import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import sideSource from "./pocket-designs/side.svg?raw";
import cornerSource from "./pocket-designs/corner.svg?raw";

// ============================================================
// ===== POCKET VISUAL TUNING ================================
// ============================================================
//
// Sau này chủ yếu chỉnh các số ở đây.
//
// trim:
//   scaleX / scaleY = phóng toàn bộ tấm bạch kim
//   rotateDeg       = xoay
//   offsetX/Y       = dịch chuyển
//   innerInset      = làm mép BÊN TRONG của bạch kim ăn vào lỗ
//
// mouth:
//   scaleX / scaleY = kích thước lỗ đen
//   rotateDeg       = xoay lỗ đen
//   offsetX/Y       = dịch lỗ đen
//
// jaws:
//   left/rightOffset = dịch toàn bộ jaw
//   depthInset       = đẩy phần đầu jaw sâu vào lỗ góc
//
export const POCKET_TUNING = {
  corner: {
    trim: {
      scaleX: 1,
      scaleY: 1,
      rotateDeg: 0,
      offsetX: 0,
      offsetY: 0,

      // 0    = giữ nguyên
      // 0.01 = bạch kim ăn vào lỗ nhẹ
      // 0.03 = rõ hơn
      // 0.05 = giá trị hiện tại của bạn
      innerInset: 0.05,
    },

    mouth: {
      scaleX: 1.3,
      scaleY: 1,
      rotateDeg: 0,
      offsetX: 0,
      offsetY: 0,
    },

    jaws: {
      leftOffsetX: -0.01,
      leftOffsetY: -0.01,

      rightOffsetX: 0,
      rightOffsetY: 0,

      depthInset: 0.03,
    },
  },

  side: {
    trim: {
      scaleX: 1,
      scaleY: 1,
      rotateDeg: 0,
      offsetX: 0,
      offsetY: 0,
      innerInset: 0,
    },

    mouth: {
      scaleX: 1,
      scaleY: 1,
      rotateDeg: 0,
      offsetX: 0,
      offsetY: 0,
    },

    jaws: {
      leftOffsetX: 0,
      leftOffsetY: 0,
      rightOffsetX: 0,
      rightOffsetY: 0,

      // Không dùng cho lỗ giữa.
      depthInset: 0,
    },

    jawSpread: 0.034,
  },

  cushion: {
    widthRatio: 0.6,
    upperOffsetZ: 0,

    // Kéo dài CHỈ 2 băng xám trái/phải về phía lỗ góc.
    verticalEndExtend: 0.07,
    // Đẩy 2 băng xám dọc trái/phải vào trong
    sideInsetX: 0,
  },
};

// ============================================================
// SVG FRAME
// ============================================================

export const SVG_FRAME = {
  size: 1000,
  scale: 500,
  originX: 500,
  originY: 650,
};

export const toPocketPoint = (point) => [
  (point.x - 500) / 500,
  (650 - point.y) / 500,
];

const REQUIRED = ["mouth", "trim", "jaw-left", "jaw-right"];

// ============================================================
// SVG PARSER
// ============================================================

export function parsePocketSvg(source, label = "SVG") {
  const doc = new DOMParser().parseFromString(source, "image/svg+xml");

  const fail = (message) => {
    throw new Error(`${label}: ${message}`);
  };

  if (doc.querySelector("parsererror")) {
    fail("SVG không hợp lệ.");
  }

  const root = doc.documentElement;

  if (
    root.tagName.toLowerCase() !== "svg" ||
    root
      .getAttribute("viewBox")
      ?.trim()
      .split(/[\s,]+/)
      .map(Number)
      .join(" ") !== "0 0 1000 1000"
  ) {
    fail('Giữ viewBox="0 0 1000 1000".');
  }

  if (
    doc.querySelector("script,image,foreignObject,use,filter,clipPath,mask")
  ) {
    fail("Chỉ dùng vector path, không dùng ảnh, mask, filter hoặc clone.");
  }

  const parsed = new SVGLoader().parse(source);

  const paths = {};
  const reversedJaws = {};

  for (const id of REQUIRED) {
    if (doc.querySelectorAll(`[id="${id}"]`).length !== 1) {
      fail(`Cần đúng một path có ID ${id}.`);
    }

    const candidate = parsed.paths.find((path) => path.userData.node.id === id);

    if (!candidate || candidate.subPaths.length !== 1) {
      fail(`${id} phải là một path liên tục (không group hoặc compound path).`);
    }

    const curve = candidate.subPaths[0];

    const points = curve.getPoints(64);

    if (
      points.length < 2 ||
      points.length > 12000 ||
      points.some(
        (p) =>
          !Number.isFinite(p.x) ||
          !Number.isFinite(p.y) ||
          p.x < 0 ||
          p.x > 1000 ||
          p.y < 0 ||
          p.y > 1000,
      )
    ) {
      fail(`${id}: đường phải nằm trong khung 1000 × 1000.`);
    }

    const closed =
      curve.autoClose || points[0].distanceTo(points.at(-1)) < 0.05;

    if ((id === "mouth" || id === "trim") && !closed) {
      fail(`${id}: phải đóng đường (Close path).`);
    }

    if (id.startsWith("jaw")) {
      if (closed) {
        fail(`${id}: giữ đường mở, đi từ mặt chơi đến phía viền bạc.`);
      }

      reversedJaws[id] = points[0].y < points.at(-1).y;

      const ordered = reversedJaws[id] ? [...points].reverse() : points;

      if (ordered.some((p, i) => i && p.y > ordered[i - 1].y + 0.05)) {
        fail(`${id}: không gập ngược đường theo chiều dọc.`);
      }

      if (points.some((p) => (id === "jaw-left" ? p.x >= 500 : p.x <= 500))) {
        fail(`${id}: giữ đường ở đúng bên trục giữa.`);
      }
    } else {
      if (Math.abs(THREE.ShapeUtils.area(points)) < 10) {
        fail(`${id}: diện tích quá nhỏ.`);
      }
    }

    paths[id] = curve;
  }

  return {
    label,

    paths,

    contour(id) {
      return paths[id].getPoints(64).map(toPocketPoint);
    },

    jaw(right, t) {
      const id = right ? "jaw-right" : "jaw-left";

      return toPocketPoint(paths[id].getPoint(reversedJaws[id] ? 1 - t : t));
    },

    jawBreaks(right) {
      const id = right ? "jaw-right" : "jaw-left";

      const lengths = paths[id].getCurveLengths();

      const total = lengths.at(-1);

      return lengths
        .slice(0, -1)
        .map((length) =>
          reversedJaws[id] ? 1 - length / total : length / total,
        );
    },
  };
}

// ============================================================
// POCKET TUNING
// ============================================================

function tunedDesign(design, kind) {
  // ----------------------------------------------------------
  // Jaw offsets
  // ----------------------------------------------------------

  const jawOffset = (right) => {
    const jaws = POCKET_TUNING[kind].jaws;

    const key = right ? "right" : "left";

    const offset = [jaws[`${key}OffsetX`], -jaws[`${key}OffsetY`]];

    if (offset.some((v) => !Number.isFinite(v))) {
      throw new Error(`${kind}.jaws: offsets must be finite.`);
    }

    return offset;
  };

  // ----------------------------------------------------------
  // Original SVG contours
  // ----------------------------------------------------------

  const originals = {
    trim: design.contour("trim"),

    mouth: design.contour("mouth"),
  };

  // ----------------------------------------------------------
  // Stable pivots
  // ----------------------------------------------------------

  const pivots = Object.fromEntries(
    Object.entries(originals)

      .map(([id, points]) => {
        const xs = points.map((p) => p[0]);

        const ys = points.map((p) => -p[1]);

        return [
          id,

          [
            (Math.min(...xs) + Math.max(...xs)) / 2,

            (Math.min(...ys) + Math.max(...ys)) / 2,
          ],
        ];
      }),
  );

  // ----------------------------------------------------------
  // Standard scale / rotate / offset
  // ----------------------------------------------------------

  function transformContour(id) {
    const tuning = POCKET_TUNING[kind][id];

    const [px, py] = pivots[id];

    const angle = (tuning.rotateDeg * Math.PI) / 180;

    const cos = Math.cos(angle);

    const sin = Math.sin(angle);

    return originals[id].map(([l, d]) => {
      const x = (l - px) * tuning.scaleX;

      const y = (-d - py) * tuning.scaleY;

      return [
        px + x * cos - y * sin + tuning.offsetX,

        -(py + x * sin + y * cos + tuning.offsetY),
      ];
    });
  }

  // ----------------------------------------------------------
  // Tuned mouth
  // ----------------------------------------------------------

  function getTunedMouth() {
    return transformContour("mouth");
  }

  // ----------------------------------------------------------
  // Move ONLY inner trim edge.
  //
  // Outer platinum outline remains fixed.
  // ----------------------------------------------------------

  function applyTrimInnerInset(trimPoints) {
    const tuning = POCKET_TUNING[kind].trim;

    const innerInset = tuning.innerInset ?? 0;

    if (kind !== "corner" || !Number.isFinite(innerInset) || innerInset === 0) {
      return trimPoints;
    }

    // Dùng mouth GỐC để xác định đâu là mép trong.
    const rawMouth = originals.mouth;

    // Mouth sau tuning chỉ dùng làm hướng di chuyển.
    const tunedMouth = getTunedMouth();

    const mouthCenter = tunedMouth.reduce(
      (sum, [x, y]) => [
        sum[0] + x / tunedMouth.length,

        sum[1] + y / tunedMouth.length,
      ],

      [0, 0],
    );

    return trimPoints.map((point, index) => {
      const rawPoint = originals.trim[index];

      let nearestRawMouth = Infinity;

      for (const [mx, my] of rawMouth) {
        const distance = Math.hypot(
          rawPoint[0] - mx,

          rawPoint[1] - my,
        );

        if (distance < nearestRawMouth) {
          nearestRawMouth = distance;
        }
      }

      // Chỉ mép cực gần lỗ được thay đổi.
      // Phần ngoài bạch kim khóa nguyên.
      const INNER_EDGE_DISTANCE = 0.055;

      if (nearestRawMouth > INNER_EDGE_DISTANCE) {
        return [point[0], point[1]];
      }

      const dx = mouthCenter[0] - point[0];

      const dy = mouthCenter[1] - point[1];

      const length = Math.hypot(dx, dy) || 1;

      return [
        point[0] + (dx / length) * innerInset,

        point[1] + (dy / length) * innerInset,
      ];
    });
  }

  // ==========================================================
  // RETURN DESIGN
  // ==========================================================

  return {
    ...design,

    rawJaw: design.jaw,

    jawOffset,

    jaw(right, t) {
      const [l, d] = design.jaw(right, t);

      const [x, y] = jawOffset(right);

      return [l + x, d + y];
    },

    rawContour(id) {
      return design.contour(id);
    },

    contour(id) {
      // ------------------------------------------------------
      // Jaw contours
      // ------------------------------------------------------

      if (!originals[id]) {
        const [x, y] = jawOffset(id === "jaw-right");

        return design.contour(id).map(([l, d]) => [l + x, d + y]);
      }

      // ------------------------------------------------------
      // Config validation
      // ------------------------------------------------------

      const tuning = POCKET_TUNING[kind][id];

      if (
        !Number.isFinite(tuning.scaleX) ||
        !Number.isFinite(tuning.scaleY) ||
        !Number.isFinite(tuning.rotateDeg) ||
        !Number.isFinite(tuning.offsetX) ||
        !Number.isFinite(tuning.offsetY) ||
        tuning.scaleX <= 0 ||
        tuning.scaleY <= 0
      ) {
        throw new Error(
          `${kind}.${id}: tuning requires finite numbers and positive scales.`,
        );
      }

      // ------------------------------------------------------
      // Normal transform
      // ------------------------------------------------------

      let points = transformContour(id);

      // ------------------------------------------------------
      // Corner platinum inner thickness
      // ------------------------------------------------------

      if (id === "trim") {
        points = applyTrimInnerInset(points);
      }

      return points;
    },
  };
}

// ============================================================
// POCKET DESIGN CACHE
// ============================================================

let templates;

export function getPocketDesign(pocket) {
  templates ??= {
    side: tunedDesign(parsePocketSvg(sideSource, "side.svg"), "side"),

    corner: tunedDesign(parsePocketSvg(cornerSource, "corner.svg"), "corner"),
  };

  const design = templates[pocket.side ? "side" : "corner"];

  // Reflect opposite corners so the same supplied jaw meets
  // the same rail direction.
  if (!pocket.side && pocket.x * pocket.z > 0) {
    return {
      contour(id) {
        return design.contour(id).map(([l, d]) => [-l, d]);
      },

      rawContour(id) {
        return design.rawContour(id).map(([l, d]) => [-l, d]);
      },

      rawJaw(right, t) {
        const [l, d] = design.rawJaw(!right, t);

        return [-l, d];
      },

      jawOffset(right) {
        const [l, d] = design.jawOffset(!right);

        return [-l, d];
      },

      jaw(right, t) {
        const [l, d] = design.jaw(!right, t);

        return [-l, d];
      },

      jawBreaks(right) {
        return design.jawBreaks(!right);
      },
    };
  }

  return design;
}
