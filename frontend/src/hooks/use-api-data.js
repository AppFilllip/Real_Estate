import { useEffect, useState } from "react";
import { api } from "../services/api";

export function useApiData(endpoint, fallback, params = {}, { enabled = true } = {}) {
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError("");

    api
      .get(endpoint, { params })
      .then((response) => {
        if (active) setData(response.data.data);
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || "Backend data unavailable.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [endpoint, version, JSON.stringify(params), enabled]);

  return [data, setData, loading, error, () => setVersion((value) => value + 1)];
}
