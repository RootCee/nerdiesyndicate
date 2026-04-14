import { useEffect, useMemo, useState } from "react";
import {
  buildLocalOperatorCertificationProofSummary,
  readOperatorCertificationProofSummary,
  type OperatorCertificationProofSummary,
} from "../lib/certificationProofs";
import type { LocalMissionSubjectState } from "../lib/missionHarness";

interface UseOperatorCertificationProofSummaryResult {
  proofSummary: OperatorCertificationProofSummary;
  loading: boolean;
  refreshProofSummary: () => Promise<void>;
}

export function useOperatorCertificationProofSummary(
  walletAddress: string | null,
  missionState: LocalMissionSubjectState | null
): UseOperatorCertificationProofSummaryResult {
  const localFallback = useMemo(
    () =>
      missionState
        ? buildLocalOperatorCertificationProofSummary(missionState)
        : {
            supportedMissionIds: [],
            certifiedMissionIds: [],
            proofsByMissionId: {},
          },
    [missionState]
  );
  const [proofSummary, setProofSummary] =
    useState<OperatorCertificationProofSummary>(localFallback);
  const [loading, setLoading] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (!missionState) {
      setProofSummary(localFallback);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setProofSummary(localFallback);

    if (!walletAddress) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);

    void readOperatorCertificationProofSummary({
      missionState,
      walletAddress,
    })
      .then((nextSummary) => {
        if (!cancelled) {
          setProofSummary(nextSummary);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProofSummary(localFallback);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [localFallback, missionState, refreshNonce, walletAddress]);

  return {
    proofSummary,
    loading,
    refreshProofSummary: async () => {
      setRefreshNonce((current) => current + 1);
    },
  };
}
