import {
  AtomicalSubtype,
  AtomicalUnionResponse,
  CONTAINERResponse,
  DMITEMResponse,
  FTResponse,
  REALMResponse,
} from "./interface";

export const isFT = (
  atomical: AtomicalUnionResponse,
): atomical is FTResponse => {
  return atomical.type === "FT" && atomical.subtype !== "direct";
};

export const isDMINT = (
  atomical: AtomicalUnionResponse,
): atomical is DMITEMResponse => {
  return (
    atomical.subtype === AtomicalSubtype.DMITEM ||
    atomical.subtype === AtomicalSubtype.REQUEST_DMITEM
  );
};

export const isREALM = (
  atomical: AtomicalUnionResponse,
): atomical is REALMResponse => {
  return (
    atomical.subtype === AtomicalSubtype.REALM ||
    atomical.subtype === AtomicalSubtype.REQUEST_REALM
  );
};

export const isCONTAINER = (
  atomical: AtomicalUnionResponse,
): atomical is CONTAINERResponse => {
  return (
    atomical.subtype === AtomicalSubtype.CONTAINER ||
    atomical.subtype === AtomicalSubtype.REQUEST_CONTAINER
  );
};
