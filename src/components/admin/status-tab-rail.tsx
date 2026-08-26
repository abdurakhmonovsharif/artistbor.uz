"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusTabRailItem<Key extends string> = {
  key: Key;
  label: string;
  count: number;
  countClassName?: string;
};

type StatusTabRailProps<Key extends string> = {
  items: StatusTabRailItem<Key>[];
  activeKey: Key;
  ariaLabel: string;
  previousLabel: string;
  nextLabel: string;
  onChange: (key: Key) => void;
  controlsId?: string;
  className?: string;
};

type ScrollState = {
  overflowing: boolean;
  canScrollBack: boolean;
  canScrollForward: boolean;
};

const initialScrollState: ScrollState = {
  overflowing: false,
  canScrollBack: false,
  canScrollForward: false,
};

export function StatusTabRail<Key extends string>({
  items,
  activeKey,
  ariaLabel,
  previousLabel,
  nextLabel,
  onChange,
  controlsId,
  className,
}: StatusTabRailProps<Key>) {
  const railRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<Key, HTMLButtonElement>());
  const [scrollState, setScrollState] = useState<ScrollState>(initialScrollState);

  const updateScrollState = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;

    const maxScrollLeft = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const nextState = {
      overflowing: maxScrollLeft > 2,
      canScrollBack: rail.scrollLeft > 2,
      canScrollForward: rail.scrollLeft < maxScrollLeft - 2,
    };

    setScrollState((current) =>
      current.overflowing === nextState.overflowing
      && current.canScrollBack === nextState.canScrollBack
      && current.canScrollForward === nextState.canScrollForward
        ? current
        : nextState,
    );
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    updateScrollState();
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(rail);
    Array.from(rail.children).forEach((child) => resizeObserver.observe(child));
    rail.addEventListener("scroll", updateScrollState, { passive: true });

    return () => {
      resizeObserver.disconnect();
      rail.removeEventListener("scroll", updateScrollState);
    };
  }, [updateScrollState]);

  useEffect(() => {
    tabRefs.current.get(activeKey)?.scrollIntoView({
      behavior: "auto",
      block: "nearest",
      inline: "nearest",
    });
    updateScrollState();
  }, [activeKey, updateScrollState]);

  const scrollRail = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rail.scrollBy({
      left: direction * Math.max(180, rail.clientWidth * 0.72),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  const focusTab = (index: number) => {
    const item = items[index];
    if (!item) return;
    tabRefs.current.get(item.key)?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusTab((index + 1) % items.length);
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusTab((index - 1 + items.length) % items.length);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      focusTab(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      focusTab(items.length - 1);
    }
  };

  return (
    <div
      className={cn(
        "artistbor-status-rail",
        scrollState.overflowing && "artistbor-status-rail-overflowing",
        className,
      )}
    >
      {scrollState.overflowing ? (
        <StatusRailScrollButton
          direction="back"
          label={previousLabel}
          disabled={!scrollState.canScrollBack}
          onClick={() => scrollRail(-1)}
        />
      ) : null}

      <div
        ref={railRef}
        role="tablist"
        aria-label={ariaLabel}
        className="artistbor-status-rail-scroll"
      >
        {items.map((item, index) => {
          const selected = item.key === activeKey;

          return (
            <button
              key={item.key}
              ref={(node) => {
                if (node) tabRefs.current.set(item.key, node);
                else tabRefs.current.delete(item.key);
              }}
              id={controlsId ? `${controlsId}-${item.key}-tab` : undefined}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={controlsId}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(item.key)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cn(
                "artistbor-status-rail-tab",
                selected ? "artistbor-status-rail-tab-active" : "artistbor-status-rail-tab-idle",
              )}
            >
              <span>{item.label}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-bold",
                  selected
                    ? "bg-[#fff7ed] text-[#f97316] ring-1 ring-[#fed7aa] dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20"
                    : item.countClassName,
                )}
              >
                {item.count}
              </span>
              {selected ? <span aria-hidden="true" className="artistbor-status-rail-indicator" /> : null}
            </button>
          );
        })}
      </div>

      {scrollState.overflowing ? (
        <StatusRailScrollButton
          direction="forward"
          label={nextLabel}
          disabled={!scrollState.canScrollForward}
          onClick={() => scrollRail(1)}
        />
      ) : null}
    </div>
  );
}

function StatusRailScrollButton({
  direction,
  label,
  disabled,
  onClick,
}: {
  direction: "back" | "forward";
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "back" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="artistbor-status-rail-scroll-button"
    >
      <Icon className="size-4" />
    </button>
  );
}
