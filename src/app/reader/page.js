"use client";
import { useState, useEffect, useRef } from "react";
import OpenSeadragon from "openseadragon";
import {
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InformationCircleIcon,
  XMarkIcon,
  BookmarkIcon,
  PhotoIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/outline";
import pageMap from "@/data/page-mapping.json";

/* ───────── Roman ↔ Arabic conversion + dynamic mapping ───────── */
function toRoman(num) {
  if (!num || num <= 0) return "";
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = [
    "M",
    "CM",
    "D",
    "CD",
    "C",
    "XC",
    "L",
    "XL",
    "X",
    "IX",
    "V",
    "IV",
    "I",
  ];
  let res = "";
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]) {
      num -= vals[i];
      res += syms[i];
    }
  }
  return res.toLowerCase();
}
const extractInternal = (path) => path.match(/(\d{4})\.jpg$/)?.[1];

function buildDynamicMap(pm) {
  const map = {};
  const entries = Object.entries(pm).sort((a, b) => {
    const aNum = parseInt(a[1].match(/(\d+)\.jpg$/)?.[1] || "0");
    const bNum = parseInt(b[1].match(/(\d+)\.jpg$/)?.[1] || "0");
    return aNum - bNum;
  });
  for (const [key, path] of entries) {
    const internal = extractInternal(path);
    if (!internal) continue;
    const type = /^[ivxlcdm]+$/i.test(key) ? "roman" : "arabic";
    map[internal] = { type, display: key };
  }
  return map;
}

const internalDisplayMap = buildDynamicMap(pageMap);
const orderedInternalIds = Object.keys(internalDisplayMap).sort(
  (a, b) => parseInt(a) - parseInt(b)
);
const romanDisplayCount = orderedInternalIds.filter(
  (id) => internalDisplayMap[id].type === "roman"
).length;
const arabicDisplayCount = orderedInternalIds.length - romanDisplayCount;

function getDisplayFromInternal(id) {
  return internalDisplayMap[id]?.display || id;
}
function getInternalFromDisplay(display) {
  const isRomanLiteral = /^[ivxlcdm]+$/i.test(display);
  const isArabicNumber = /^\d+$/.test(display);

  if (isRomanLiteral) {
    const key = display.toLowerCase();
    for (const id of orderedInternalIds) {
      if (
        internalDisplayMap[id].type === "roman" &&
        internalDisplayMap[id].display === key
      )
        return id;
    }
  }

  if (isArabicNumber) {
    const n = parseInt(display, 10);
    if (!n || n <= 0) return orderedInternalIds[0];
    // Arabic display id
    for (const id of orderedInternalIds) {
      if (
        internalDisplayMap[id].type === "arabic" &&
        parseInt(internalDisplayMap[id].display, 10) === n
      )
        return id;
    }
    // Roman ordinal
    if (n <= romanDisplayCount) {
      let count = 0;
      for (const id of orderedInternalIds) {
        if (internalDisplayMap[id].type === "roman") {
          count++;
          if (count === n) return id;
        }
      }
    }
  }
  return orderedInternalIds[0];
}

/* ───────── Reader Component ───────── */
export default function Reader() {
  const [divider, setDivider] = useState(60);
  const [currentPage, setCurrentPage] = useState("0005");
  const [htmlContent, setHtmlContent] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [toast, setToast] = useState(false);
  const [viewMode, setViewMode] = useState("transcript");
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const viewerRef = useRef(null);
  const [viewer, setViewer] = useState(null);
  const transcriptRef = useRef(null);

  /* Load transcript (strip pgImg) */
  useEffect(() => {
    fetch("/data/LB00-1_facs.html")
      .then((r) => r.text())
      .then((html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        doc.querySelectorAll("img.pgImg").forEach((img) => img.remove());
        setHtmlContent(doc.body.innerHTML);
      });
  }, []);

  /* Responsive */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* OpenSeadragon: desktop always, mobile only when in image view */
  useEffect(() => {
    const shouldInit = !isMobile || (isMobile && viewMode === "image");
    if (!shouldInit) return;

    const currentDisplayKey = getDisplayFromInternal(currentPage);
    const imagePath = pageMap[currentDisplayKey]
      ? `/${pageMap[currentDisplayKey]}`
      : null;

    if (viewer) {
      try {
        viewer.destroy();
      } catch {}
      setViewer(null);
    }
    if (!imagePath || !viewerRef.current) return;

    const v = OpenSeadragon({
      element: viewerRef.current,
      prefixUrl:
        "https://cdn.jsdelivr.net/npm/openseadragon@3.0.0/build/openseadragon/images/",
      tileSources: { type: "image", url: imagePath },
      showNavigationControl: !isMobile,
      showZoomControl: !isMobile,
      showHomeControl: !isMobile,
      showFullPageControl: false,
    });
    setViewer(v);

    return () => {
      try {
        v.destroy();
      } catch {}
    };
  }, [currentPage, isMobile, viewMode]);

  /* When switching back to transcript, scroll to current page */
  useEffect(() => {
    if (viewMode === "transcript" && transcriptRef.current) {
      const el = document.getElementById(currentPage);
      if (el) el.scrollIntoView({ behavior: "instant", block: "center" });
    }
  }, [viewMode, currentPage]);

  /* Transcript scroll → update currentPage */
  const handleScroll = (e) => {
    const els = e.target.querySelectorAll(".newPage");
    for (let el of els) {
      const r = el.getBoundingClientRect();
      if (r.top >= 0 && r.top < window.innerHeight * 0.3) {
        const id = el.id;
        if (id && id !== currentPage) setCurrentPage(id);
        break;
      }
    }
  };

  /* Navigation helpers */
  const goToPage = (display) => {
    const id = getInternalFromDisplay(display);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    setCurrentPage(id);
  };
  const goPrev = () => {
    const idx = orderedInternalIds.indexOf(currentPage);
    if (idx > 0) goToPage(getDisplayFromInternal(orderedInternalIds[idx - 1]));
  };
  const goNext = () => {
    const idx = orderedInternalIds.indexOf(currentPage);
    if (idx < orderedInternalIds.length - 1)
      goToPage(getDisplayFromInternal(orderedInternalIds[idx + 1]));
  };

  /* Current display info */
  const current = internalDisplayMap[currentPage];
  const currType = current?.type;
  const currDisplay = current?.display || "—";
  const currOrdinal = (() => {
    if (currType === "roman") {
      let count = 0;
      for (const id of orderedInternalIds) {
        if (internalDisplayMap[id].type === "roman") {
          count++;
          if (id === currentPage) return count;
        }
      }
    }
    return null;
  })();

  /* Desktop selector inputs */
  const [romanInput, setRomanInput] = useState("");
  const [arabicInput, setArabicInput] = useState("");
  useEffect(() => {
    if (currType === "roman") {
      setRomanInput(String(currOrdinal || ""));
      setArabicInput("");
    } else if (currType === "arabic") {
      setArabicInput(currDisplay);
      setRomanInput("");
    } else {
      setRomanInput("");
      setArabicInput("");
    }
  }, [currentPage, currType, currOrdinal, currDisplay]);

  /* Handlers */
  const handleDrag = (e) => {
    const pct = (e.clientX / window.innerWidth) * 100;
    if (pct > 20 && pct < 80) setDivider(pct);
  };
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };
  const handleBookmark = () => {
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  };
  const toggleViewMode = () =>
    setViewMode((v) => (v === "transcript" ? "image" : "transcript"));

  const handleRomanSelectorSubmit = (e) => {
    e.preventDefault();
    if (!romanInput) return;
    const ordinal = parseInt(romanInput, 10);
    if (ordinal > 0 && ordinal <= romanDisplayCount) goToPage(toRoman(ordinal));
    else setRomanInput("");
  };
  const handleArabicSelectorSubmit = (e) => {
    e.preventDefault();
    if (!arabicInput) return;
    const n = parseInt(arabicInput, 10);
    if (n > 0) goToPage(String(n));
    else setArabicInput("");
  };

  /* ───────── Render ───────── */
  return (
    <div className="h-screen flex flex-col bg-[#FAF7F0] text-[#4A4947] overflow-hidden">
      <style>{`
        body,html,#__next{
          margin:0;padding:0;height:100%;overflow:hidden;
          background:#FAF7F0;color:#4A4947;font-family:'Spectral',serif;
        }
      `}</style>

      {/* Fixed Top Nav (always glued, no shift) */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#B17457] text-[#FAF7F0] shadow-sm border-b border-[#D8D2C2]">
        <div className="flex items-center justify-between px-6 py-3">
          {/* LEFT: title + info */}
          <div className="flex items-center gap-2 relative">
            <h1
              className="text-lg font-bold"
              style={{ fontFamily: "Taviraj, serif", color: "#FAF7F0" }}
            >
              Lyrical Ballads
            </h1>
            <div className="relative">
              <InformationCircleIcon
                className="h-5 w-5 cursor-pointer hover:text-[#D8D2C2]"
                onClick={() => setShowInfo((s) => !s)}
              />
              {showInfo && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 bg-[#FAF7F0] text-[#4A4947] border border-[#D8D2C2] rounded-lg shadow-lg p-4 w-80 z-50">
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-[#FAF7F0]" />
                  <div className="flex justify-between mb-1">
                    <h2 className="font-semibold">About This Book</h2>
                    <XMarkIcon
                      className="h-4 w-4 cursor-pointer"
                      onClick={() => setShowInfo(false)}
                    />
                  </div>
                  <p className="text-sm leading-relaxed">
                    <em>Lyrical Ballads</em> (1800) — facsimile & transcript
                    edition.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* CENTER: Desktop page navigation (dual selectors + prev/next) */}
          <div className="hidden lg:flex items-center gap-3">
            <button onClick={goPrev} className="p-1 text-[#FAF7F0]">
              <ChevronLeftIcon className="h-5 w-5" />
            </button>

            {/* Roman selector (display shows roman, input uses arabic ordinal) */}
            <form
              onSubmit={handleRomanSelectorSubmit}
              className="flex items-center gap-2 bg-[#FAF7F0] text-[#4A4947] px-3 py-1 rounded shadow-sm border border-[#D8D2C2]"
            >
              <div className="text-xs">Roman</div>
              <input
                type="text"
                className="w-12 text-center bg-transparent border-none focus:outline-none text-sm"
                placeholder={`1-${romanDisplayCount}`}
                value={romanInput}
                onChange={(e) =>
                  setRomanInput(e.target.value.replace(/[^\d]/g, ""))
                }
                title={`Enter roman page ordinal as Arabic number (e.g. 11 for ${toRoman(
                  11
                )}).`}
                disabled={romanDisplayCount === 0}
              />
              <div className="text-sm">
                {currType === "roman" ? currDisplay : "—"}
              </div>
            </form>

            {/* Arabic selector */}
            <form
              onSubmit={handleArabicSelectorSubmit}
              className="flex items-center gap-2 bg-[#FAF7F0] text-[#4A4947] px-3 py-1 rounded shadow-sm border border-[#D8D2C2]"
            >
              <div className="text-xs">Arabic</div>
              <input
                type="text"
                className="w-12 text-center bg-transparent border-none focus:outline-none text-sm"
                placeholder={`1-${arabicDisplayCount}`}
                value={arabicInput}
                onChange={(e) =>
                  setArabicInput(e.target.value.replace(/[^\d]/g, ""))
                }
                title="Enter Arabic page number (e.g. 10)."
                disabled={arabicDisplayCount === 0}
              />
              <div className="text-sm">
                {currType === "arabic" ? currDisplay : "—"}
              </div>
            </form>

            <button onClick={goNext} className="p-1 text-[#FAF7F0]">
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>

          {/* RIGHT: version + desktop controls + mobile menu */}
          <div className="flex items-center gap-3">
            {/* version dropdown preserved */}
            <select className="bg-transparent text-[#FAF7F0] font-medium focus:outline-none cursor-pointer hidden sm:block">
              <option>Version 1</option>
              <option>Version 2</option>
            </select>

            {/* Desktop controls */}
            <div className="hidden lg:flex items-center gap-3">
              <button onClick={handleBookmark} title="Bookmark page">
                <BookmarkIcon className="h-5 w-5" />
              </button>
              <button onClick={toggleFullscreen} title="Toggle fullscreen">
                {fullscreen ? (
                  <ArrowsPointingInIcon className="h-5 w-5" />
                ) : (
                  <ArrowsPointingOutIcon className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Mobile menu w/ smooth icon swap */}
            <div className="lg:hidden relative">
              <button
                onClick={() => setMobileMenuOpen((s) => !s)}
                className="p-1 transition-transform duration-300"
                aria-label="More options"
              >
                {mobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6 text-[#FAF7F0] transform rotate-180 transition-transform duration-300" />
                ) : (
                  <EllipsisVerticalIcon className="h-6 w-6 text-[#FAF7F0] transform rotate-0 transition-transform duration-300" />
                )}
              </button>

              {mobileMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-[#FAF7F0] text-[#4A4947] border border-[#D8D2C2] rounded shadow-lg p-3 z-50">
                  {/* Mobile unified page selector */}
                  <div className="mb-2">
                    <div className="text-sm font-medium">Go to page</div>
                    <div className="text-xs text-[#4A4947]/80 mb-1">
                      Current:{" "}
                      {currType === "roman"
                        ? `Roman ${currDisplay}`
                        : currType === "arabic"
                        ? `Arabic ${currDisplay}`
                        : "—"}
                    </div>
                    <div className="flex items-center w-full gap-2">
                      <input
                        type="text"
                        value={arabicInput || romanInput}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^\w\d]/g, "");
                          setArabicInput(v);
                          setRomanInput(v);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            goToPage(arabicInput || romanInput);
                            setMobileMenuOpen(false);
                          }
                        }}
                        placeholder="Page"
                        className="flex-1 min-w-0 px-2 py-1 border rounded text-sm"
                      />
                      <button
                        onClick={() => {
                          goToPage(arabicInput || romanInput);
                          setMobileMenuOpen(false);
                        }}
                        className="px-3 py-1 rounded bg-[#B17457] text-[#FAF7F0] text-sm"
                      >
                        Go
                      </button>
                    </div>
                  </div>

                  <button
                    className="w-full text-left px-2 py-1 hover:bg-[#D8D2C2] rounded mb-1"
                    onClick={() => {
                      handleBookmark();
                      setMobileMenuOpen(false);
                    }}
                  >
                    Bookmark
                  </button>
                  <button
                    className="w-full text-left px-2 py-1 hover:bg-[#D8D2C2] rounded"
                    onClick={() => {
                      toggleFullscreen();
                      setMobileMenuOpen(false);
                    }}
                  >
                    Fullscreen
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* spacer so fixed header doesn’t overlap content */}
      <div className="h-[56px] shrink-0" />

      {/* Main viewer (no page vertical scroll; panes scroll internally) */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {isMobile ? (
          <>
            {viewMode === "transcript" && (
              <div
                ref={transcriptRef}
                className="overflow-y-auto overflow-x-hidden p-6 border-t border-[#D8D2C2] bg-[#FAF7F0] flex-1 max-w-full"
                onScroll={handleScroll}
              >
                <link rel="stylesheet" href="/css/LBstyle.css" />
                <div
                  className="max-w-3xl mx-auto break-words"
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
              </div>
            )}

            {viewMode === "image" && (
              <div className="relative flex-1 bg-[#FAF7F0]">
                <div ref={viewerRef} className="w-full h-full" />
                <button
                  onClick={goPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-[#B17457]/80 text-[#FAF7F0] rounded-full p-3"
                >
                  <ChevronLeftIcon className="h-6 w-6" />
                </button>
                <button
                  onClick={goNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#B17457]/80 text-[#FAF7F0] rounded-full p-3"
                >
                  <ChevronRightIcon className="h-6 w-6" />
                </button>
              </div>
            )}

            {/* Circular FAB */}
            <button
              onClick={toggleViewMode}
              className="lg:hidden fixed bottom-6 right-6 z-40 bg-[#B17457] text-[#FAF7F0] w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
            >
              {viewMode === "transcript" ? (
                <PhotoIcon className="h-7 w-7" />
              ) : (
                <span className="text-2xl font-serif font-bold leading-none">
                  T
                </span>
              )}
            </button>
          </>
        ) : (
          /* Desktop split */
          <div className="flex flex-1 overflow-hidden">
            <div
              ref={transcriptRef}
              className="overflow-y-auto overflow-x-hidden p-6 border-right border-r border-[#D8D2C2] bg-[#FAF7F0]"
              style={{ width: `${divider}%` }}
              onScroll={handleScroll}
            >
              <link rel="stylesheet" href="/css/LBstyle.css" />
              <div
                className="max-w-3xl mx-auto break-words"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            </div>

            <div
              className="w-1 bg-[#D8D2C2] hover:bg-[#4A4947] cursor-col-resize"
              onMouseDown={() => {
                document.addEventListener("mousemove", handleDrag);
                document.addEventListener(
                  "mouseup",
                  () => document.removeEventListener("mousemove", handleDrag),
                  { once: true }
                );
              }}
            />

            <div className="flex-1 relative border-l border-[#D8D2C2] bg-[#FAF7F0]">
              <div ref={viewerRef} className="w-full h-full" />
              <button
                onClick={goPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-[#B17457]/80 text-[#FAF7F0] rounded-full p-2 shadow"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <button
                onClick={goNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-[#B17457]/80 text-[#FAF7F0] rounded-full p-2 shadow"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#B17457] text-[#FAF7F0] px-4 py-2 rounded shadow-lg border border-[#D8D2C2]">
          Page bookmarked for later reading.
        </div>
      )}
    </div>
  );
}
