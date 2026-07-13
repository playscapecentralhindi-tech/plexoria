"use client";

import React from "react";
import { GooeySearchBar } from "@/components/ui/animated-search-bar";

const DemoOne = () => {
  return (
    <div style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#050508",
        padding: "20px",
        boxSizing: "border-box",
        width: "100%",
        overflow: "hidden"
    }}>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-black text-white tracking-wide mb-2">Gooey Search Animation</h1>
        <p className="text-xs text-slate-400 max-w-sm leading-normal">
          Click Search to expand the gooey bar, then type language names (e.g. React, Vue, Svelte) to see the morphing pull-away results.
        </p>
      </div>
      
      <GooeySearchBar />
    </div>
  );
};

export default DemoOne;
