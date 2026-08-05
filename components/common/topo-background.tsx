import React from "react";

interface TopoBackgroundProps {
  className?: string;
  background?: string;
  strokeColor?: string;
  opacity?: number;
}

export function TopoBackground({
  className,
  background = "#F7F5FD",
  strokeColor = "#e8e5df",
  opacity = 0.7,
}: TopoBackgroundProps) {
  return (
    <div
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        background: background,
      }}
    >
      <svg
        width="100%"
        height="100%"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          opacity: opacity,
        }}
      >
        {/* Top left elevation contour rings */}
        <path
          d="M -50,-50 C 100,0 200,-100 300,50 C 400,200 200,300 0,350 C -100,370 -200,300 -200,100 Z"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.2"
        />
        <path
          d="M -70,-70 C 130,-20 230,-120 340,30 C 450,180 230,330 0,390 C -120,410 -230,330 -230,120 Z"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.2"
        />
        <path
          d="M -90,-90 C 160,-40 260,-140 380,10 C 500,160 260,360 0,430 C -140,450 -260,360 -260,140 Z"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.2"
        />
        <path
          d="M -110,-110 C 190,-60 290,-160 420,-10 C 550,140 290,390 0,470 C -160,490 -290,390 -290,160 Z"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.2"
        />
        <path
          d="M -130,-130 C 220,-80 320,-180 460,-30 C 600,120 320,420 0,510 C -180,530 -320,420 -320,180 Z"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.2"
        />

        {/* Center right elevation contour rings */}
        <path
          d="M 1200,300 C 1300,250 1400,350 1500,400 C 1600,450 1500,600 1350,650 C 1200,700 1100,600 1050,550 C 1000,500 1100,350 1200,300 Z"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.2"
        />
        <path
          d="M 1170,270 C 1280,220 1390,320 1510,370 C 1630,420 1520,620 1360,680 C 1200,740 1080,630 1020,570 C 960,510 1060,320 1170,270 Z"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.2"
        />
        <path
          d="M 1140,240 C 1260,190 1380,290 1520,340 C 1660,390 1540,640 1370,710 C 1200,780 1060,660 990,590 C 920,520 1020,290 1140,240 Z"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.2"
        />
        <path
          d="M 1110,210 C 1240,160 1370,260 1530,310 C 1690,360 1560,660 1380,740 C 1200,820 1040,690 960,610 C 880,530 980,260 1110,210 Z"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.2"
        />

        {/* Bottom left elevation contour rings */}
        <path
          d="M 200,750 C 300,700 450,750 500,850 C 550,950 400,1050 250,1050 C 100,1050 50,950 100,850 C 150,750 100,800 200,750 Z"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.2"
        />
        <path
          d="M 170,720 C 280,670 450,710 510,830 C 570,950 410,1070 240,1070 C 70,1070 20,950 70,820 C 120,690 60,770 170,720 Z"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.2"
        />
        <path
          d="M 140,690 C 260,640 450,670 520,810 C 590,950 420,1090 230,1090 C 40,1090 -10,950 40,790 C 90,630 20,740 140,690 Z"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.2"
        />
      </svg>
    </div>
  );
}
