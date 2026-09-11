import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { api } from "../../services/api";
import { Screen } from "../dashboard/dashboard-screen";
import { DetailContent } from "./detail-dialog";

const fetchableDetails = new Set([
  "Leads",
  "Projects",
  "Inventory",
  "Bookings",
  "Customers",
  "Receipts",
  "Brokers",
  "Marketing",
  "Calls & IVR",
  "Inbox",
  "Tasks",
  "Users",
  "Roles",
  "Workspaces",
]);

export function DetailPage({ route, onBack }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    if (!fetchableDetails.has(route.title)) {
      setError("This backend module does not expose a direct detail endpoint yet.");
      setLoading(false);
      return () => {
        active = false;
      };
    }

    api
      .get(`${route.endpoint}/${route.id}`)
      .then((response) => {
        if (active) setDetail(response.data.data);
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.error?.message || err.response?.data?.message || "Could not load detail.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [route]);

  return (
    <Screen title={`${route.title} Detail`} description="A focused record workspace with related CRM context.">
      <div className="flex items-center justify-between gap-3">
        <Button variant="secondary" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>
      <Card className="p-4 sm:p-5">
        <DetailContent title={route.title} detail={detail || {}} loading={loading} error={error} onError={setError} onChanged={() => {}} />
      </Card>
    </Screen>
  );
}
