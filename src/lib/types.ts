/**
 * Tool-call payloads. The agent emits one of these per step; the frontend
 * renders the matching component. This is the contract between Claude and the UI.
 */

export type GapFillSpec = {
  kicker: string;
  question: string;
  body: string;
  chips: string[];
  why: string;
};

export type ArchetypeSpec = {
  category: string;
  name: string;
  description: string;
  secondary_tag?: string;
};

export type ProbeSpec = {
  kicker: string;
  central_image?: string;
  question: string;
  options: string[];
};

export type SensitivityCategory =
  | "trauma_replay"
  | "grief_visitation"
  | "ideation"
  | "abuse"
  | "acute_distress";

export type SensitivityFlagSpec = {
  category: SensitivityCategory;
  acknowledgment: string;
  continue_label: string;
};

export type InterpretSpec = {
  kicker: string;
  quote: string;
  expansion: string;
};

export type TakeawaySpec = {
  kicker: string;
  question: string;
  evening_line: string;
  /** A2UI v0.9 surface JSONL — agent emits this so the takeaway is rendered
   *  via the A2UI protocol rather than a hand-coded React component. */
  a2ui_messages: unknown[];
};

export type StepKind =
  | "capture"
  | "gap-fill"
  | "sensitivity-check"
  | "archetype"
  | "probe"
  | "interpret"
  | "takeaway";

export type SessionStep = {
  kind: StepKind;
  index: number;
};
