/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { TierFilter } from "@/components/shop/TierFilter";

describe("TierFilter", () => {
  const onFilterChange = jest.fn();

  beforeEach(() => {
    onFilterChange.mockClear();
  });

  it("renders all 5 filter options (All + 4 tiers)", () => {
    render(<TierFilter activeTier={null} onFilterChange={onFilterChange} />);
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Just Dropped")).toBeInTheDocument();
    expect(screen.getByText("Trending")).toBeInTheDocument();
    expect(screen.getByText("Cooling")).toBeInTheDocument();
    expect(screen.getByText("Evergreen")).toBeInTheDocument();
  });

  it("calls onFilterChange with the selected tier when clicking a tier button", () => {
    render(<TierFilter activeTier={null} onFilterChange={onFilterChange} />);
    fireEvent.click(screen.getByText("Trending"));
    expect(onFilterChange).toHaveBeenCalledWith("trending");
  });

  it("calls onFilterChange with null when clicking 'All'", () => {
    render(<TierFilter activeTier="trending" onFilterChange={onFilterChange} />);
    fireEvent.click(screen.getByText("All"));
    expect(onFilterChange).toHaveBeenCalledWith(null);
  });

  it("calls onFilterChange with null when clicking the active tier again", () => {
    render(
      <TierFilter activeTier="trending" onFilterChange={onFilterChange} />
    );
    fireEvent.click(screen.getByText("Trending"));
    expect(onFilterChange).toHaveBeenCalledWith(null);
  });

  it("marks the active tier button as aria-pressed=true", () => {
    render(
      <TierFilter activeTier="cooling" onFilterChange={onFilterChange} />
    );
    const coolingBtn = screen.getByText("Cooling").closest("button");
    expect(coolingBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("marks inactive tier buttons as aria-pressed=false", () => {
    render(
      <TierFilter activeTier="cooling" onFilterChange={onFilterChange} />
    );
    const trendingBtn = screen.getByText("Trending").closest("button");
    expect(trendingBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("applies active styling to the selected tier button", () => {
    render(
      <TierFilter activeTier="just_dropped" onFilterChange={onFilterChange} />
    );
    const btn = screen.getByText("Just Dropped").closest("button");
    expect(btn?.className).toContain("bg-blue-600");
  });
});
