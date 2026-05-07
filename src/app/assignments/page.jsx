"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import AssignmentsList from "@/components/AssignmentsList";

export default function AssignmentsPage() {
  return (
    <ProtectedRoute>
      <AssignmentsList />
    </ProtectedRoute>
  );
}
