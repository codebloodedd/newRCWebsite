"use client";
import { useState, useEffect, useRef } from "react";
import {
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InformationCircleIcon,
  XMarkIcon,
  BookmarkIcon,
} from "@heroicons/react/24/outline";
import pageMap from "@/data/page-mapping.json";

function normalizePageId(pageId) {
  const num = parseInt(pageId, 10);
  if (num < 53) {
    const romans = {
      5: "i",
      6: "ii",
      7: "iii",
      8: "iv",
      9: "v",
      10: "vi",
      11: "vii",
      12: "viii",
      13: "ix",
      14: "x",
      15: "xi",
      16: "xii",
      17: "xiii",
      18: "xiv",
      19: "xv",
      20: "xvi",
      21: "xvii",
      22: "xviii",
      23: "xix",
      24: "xx",
      25: "xxi",
      26: "xxii",
      27: "xxiii",
      28: "xxiv",
      29: "xxv",
      30: "xxvi",
      31: "xxvii",
      32: "xxviii",
      33: "xxix",
      34: "xxx",
      35: "xxxi",
      36: "xxxii",
      37: "xxxiii",
      38: "xxxiv",
      39: "xxxv",
      40: "xxxvi",
      41: "xxxvii",
      42: "xxxviii",
      43: "xxxix",
      44: "xl",
      45: "xli",
      46: "xlii",
      47: "xliii",
      48: "xliv",
      49: "xlv",
      50: "xlvi",
      51: "xlvii",
      52: "xlviii",
    };
    return romans[num] || pageId;
  }
  return String(num - 52);
}

export default function Reader() {
  const [divider, setDivider] = useState(60);
  const [currentPage, setCurrentPage] = useState("0005");
  const [htmlContent, setHtmlContent] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [toast, setToast] = useState(false);
  const transcriptRef = useRef(null);

  useEffect(() => {
    fetch("/data/LB00-1_facs.html")
      .then((res) => res.text())
      .then((html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        doc.querySelectorAll("img.pgImg").forEach((img) => img.remove());
        setHtmlContent(doc.body.innerHTML);
      });
  }, []);

  const handleDrag = (e) => {
    const percent = (e.clientX / window.innerWidth) * 100;
    if (percent > 20 && percent < 80) {
      setDivider(percent);
    }
  };

  const handleScroll = (e) => {
    const elements = e.target.querySelectorAll(".newPage");
    for (let el of elements) {
      const rect = el.getBoundingClientRect();
      if (rect.top >= 0 && rect.top < window.innerHeight * 0.3) {
        setCurrentPage(el.id);
        break;
      }
    }
  };

  const goToPage = (pageNum) => {
    const target = document.getElementById(pageNum);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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

  const totalPages = Object.keys(pageMap).length;
  const currentNum = parseInt(currentPage, 10) || 5;

  return (
    <div className="h-screen flex flex-col bg-[#FAF7F0] text-[#4A4947]">
      {/* Load Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,600;1,400&family=Taviraj:wght@700&display=swap"
        rel="stylesheet"
      />

      <style>{`
        body, html, #__next {
          margin: 0 !important;
          padding: 0 !important;
          height: 100% !important;
          font-family: 'Spectral', serif;
          color: #4A4947;
          background: #FAF7F0;
        }
      `}</style>

      {/* Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#B17457] text-[#FAF7F0] shadow-md border-b border-[#D8D2C2]">
        {/* Left: Title */}
        <div className="flex items-start gap-2">
          <h1 className="text-xl font-bold tracking-wider font-[var(--font-taviraj)] !text-[#FFDDB5] !important">
            Lyrical Ballads
          </h1>

          <InformationCircleIcon
            className="h-4 w-4 cursor-pointer hover:text-[#D8D2C2] mt-1"
            onClick={() => setShowInfo(true)}
          />
        </div>

        {/* Center: Page Navigation */}
        <div className="flex items-center gap-2 bg-[#FAF7F0] text-[#4A4947] px-3 py-1 rounded shadow-sm border border-[#D8D2C2]">
          <ChevronLeftIcon
            className="h-5 w-5 cursor-pointer hover:text-[#B17457]"
            onClick={() => goToPage(String(currentNum - 1).padStart(4, "0"))}
          />
          <input
            type="text"
            value={currentNum}
            onChange={(e) => goToPage(e.target.value.padStart(4, "0"))}
            className="w-12 text-center border-none bg-transparent focus:outline-none font-spectral"
          />
          <span className="text-sm">of {totalPages}</span>
          <ChevronRightIcon
            className="h-5 w-5 cursor-pointer hover:text-[#B17457]"
            onClick={() => goToPage(String(currentNum + 1).padStart(4, "0"))}
          />
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-3">
          <select className="bg-transparent text-[#FAF7F0] font-medium focus:outline-none cursor-pointer font-spectral">
            <option>Version 1</option>
            <option>Version 2</option>
          </select>
          <BookmarkIcon
            className="h-5 w-5 cursor-pointer hover:text-[#D8D2C2]"
            onClick={handleBookmark}
          />
          {fullscreen ? (
            <ArrowsPointingInIcon
              className="h-5 w-5 cursor-pointer hover:text-[#D8D2C2]"
              onClick={toggleFullscreen}
            />
          ) : (
            <ArrowsPointingOutIcon
              className="h-5 w-5 cursor-pointer hover:text-[#D8D2C2]"
              onClick={toggleFullscreen}
            />
          )}
        </div>
      </div>

      {/* Main Viewer */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div
          ref={transcriptRef}
          className="overflow-y-scroll p-6 bg-[#FAF7F0] border-r border-[#D8D2C2] shadow-inner"
          style={{ width: `${divider}%`, fontFamily: "Spectral, serif" }}
          onScroll={handleScroll}
        >
          <link rel="stylesheet" href="/css/LBstyle.css" />
          <style>{`
            p, h1, h2, h3, h4, h5, h6, blockquote, span, div {
              font-family: 'Spectral', serif !important;
              color: #4A4947 !important;
            }
            .pgImg { display: none !important; }
            .newPage {
              border-top: 1px solid #D8D2C2 !important;
              margin: 0.5rem 0 !important;
            }
            .transcript-wrapper {
              max-width: 42rem;
              margin: 0 auto !important;
            }
          `}</style>
          <div
            className="transcript-wrapper"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>

        {/* Divider */}
        <div
          className="w-1 bg-[#D8D2C2] hover:bg-[#4A4947] transition-colors cursor-col-resize"
          onMouseDown={() => {
            document.addEventListener("mousemove", handleDrag);
            document.addEventListener(
              "mouseup",
              () => {
                document.removeEventListener("mousemove", handleDrag);
              },
              { once: true }
            );
          }}
        />

        {/* Right Panel */}
        <div className="flex-1 flex items-center justify-center bg-[#FAF7F0] border-l border-[#D8D2C2]">
          <img
            src={`/${pageMap[normalizePageId(currentPage)]}`}
            alt={`Page ${currentPage}`}
            className="max-h-full object-contain shadow-md"
          />
        </div>
      </div>

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className="bg-[#FAF7F0] text-[#4A4947] max-w-lg p-6 rounded shadow-lg relative"
            style={{ fontFamily: "Spectral, serif" }}
          >
            <button
              className="absolute top-2 right-2"
              onClick={() => setShowInfo(false)}
            >
              <XMarkIcon className="h-6 w-6 text-[#4A4947] hover:text-black" />
            </button>
            <h2 className="text-xl font-bold mb-4">About This Book</h2>
            <p className="mb-2">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus
              dapibus fermentum turpis, sit amet accumsan turpis malesuada vel.
            </p>
            <p>
              Suspendisse potenti. Aliquam erat volutpat. Donec euismod turpis a
              semper fringilla.
            </p>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#B17457] text-[#FAF7F0] px-4 py-2 rounded shadow-lg border border-[#D8D2C2] font-spectral">
          Page bookmarked for later reading.
        </div>
      )}
    </div>
  );
}
