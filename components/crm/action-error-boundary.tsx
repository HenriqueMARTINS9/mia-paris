"use client";

import React from "react";

import { ErrorState } from "@/components/crm/error-state";

interface ActionErrorBoundaryProps {
  children: React.ReactNode;
  description?: string;
  title?: string;
}

interface ActionErrorBoundaryState {
  hasError: boolean;
}

export class ActionErrorBoundary extends React.Component<
  ActionErrorBoundaryProps,
  ActionErrorBoundaryState
> {
  override state: ActionErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  override componentDidCatch(error: Error) {
    console.error("[action-error-boundary]", error);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          title={this.props.title ?? "Une action métier a échoué"}
          description={
            this.props.description ??
            "Recharge l’écran ou réessaie l’action. Le reste du cockpit reste disponible."
          }
        />
      );
    }

    return this.props.children;
  }
}
