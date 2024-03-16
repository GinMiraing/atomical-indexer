import {
  AtomicalSubtype,
  AtomicalUnionResponse,
  CONTAINERResponse,
  DMITEMResponse,
  REALMResponse,
  SubRealmResponse,
} from "./interface";

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

export const isSubRealm = (
  atomical: AtomicalUnionResponse,
): atomical is SubRealmResponse => {
  return (
    atomical.subtype === AtomicalSubtype.SUBREALM ||
    atomical.subtype === AtomicalSubtype.REQUEST_SUBREALM
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
