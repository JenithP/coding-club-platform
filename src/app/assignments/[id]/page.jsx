"use client";

import { useParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import AssignmentDetail from "@/components/AssignmentDetail";

export default function AssignmentDetailPage() {
  const { id } = useParams();
  return (
    <ProtectedRoute>
      <AssignmentDetail id={id} />
    </ProtectedRoute>
  );
}
