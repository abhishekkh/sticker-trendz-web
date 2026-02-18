/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { TierBadge } from "@/components/shop/TierBadge";

describe("TierBadge", () => {
  it("renders 'Just Dropped' for just_dropped tier", () => {
    render(<TierBadge tier="just_dropped" />);
    expect(screen.getByText("Just Dropped")).toBeInTheDocument();
  });

  it("renders 'Trending' for trending tier", () => {
    render(<TierBadge tier="trending" />);
    expect(screen.getByText("Trending")).toBeInTheDocument();
  });

  it("renders 'Cooling' for cooling tier", () => {
    render(<TierBadge tier="cooling" />);
    expect(screen.getByText("Cooling")).toBeInTheDocument();
  });

  it("renders 'Evergreen' for evergreen tier", () => {
    render(<TierBadge tier="evergreen" />);
    expect(screen.getByText("Evergreen")).toBeInTheDocument();
  });

  it("applies orange class for just_dropped", () => {
    const { container } = render(<TierBadge tier="just_dropped" />);
    const badge = container.querySelector("span");
    expect(badge?.className).toContain("bg-orange-100");
    expect(badge?.className).toContain("text-orange-700");
  });

  it("applies blue class for trending", () => {
    const { container } = render(<TierBadge tier="trending" />);
    const badge = container.querySelector("span");
    expect(badge?.className).toContain("bg-blue-100");
    expect(badge?.className).toContain("text-blue-700");
  });

  it("applies slate class for cooling", () => {
    const { container } = render(<TierBadge tier="cooling" />);
    const badge = container.querySelector("span");
    expect(badge?.className).toContain("bg-slate-100");
  });

  it("applies green class for evergreen", () => {
    const { container } = render(<TierBadge tier="evergreen" />);
    const badge = container.querySelector("span");
    expect(badge?.className).toContain("bg-green-100");
  });

  it("sets aria-label with tier name for accessibility", () => {
    render(<TierBadge tier="trending" />);
    expect(
      screen.getByLabelText("Pricing tier: Trending")
    ).toBeInTheDocument();
  });
});
