"use client";

import React, { ReactNode } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow as BaseTableRow,
  TableHead as BaseTableHead,
  TableCell as BaseTableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, X, Trash2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface DataTableProps {
  children: ReactNode;
  className?: string;
}

export function DataTable({ children, className }: DataTableProps) {
  return (
    <div
      className={`flex-1 bg-white dark:bg-[#121212] rounded-lg dark:rounded-[6px] border border-[var(--semantic-stroke)] flex flex-col min-h-0 overflow-hidden ${className || ""}`}
    >
      <Table>{children}</Table>
    </div>
  );
}

interface DataTableHeaderProps {
  children: ReactNode;
  className?: string;
}

export function DataTableHeader({ children, className }: DataTableHeaderProps) {
  return (
    <TableHeader
      className={`bg-white dark:bg-[#121212] shadow-sm sticky top-0 z-10 ${className || ""}`}
    >
      {children}
    </TableHeader>
  );
}

interface DataTableBodyProps {
  children: ReactNode;
  className?: string;
}

export function DataTableBody({ children, className }: DataTableBodyProps) {
  return (
    <TableBody className={`overflow-y-auto ${className || ""}`}>
      {children}
    </TableBody>
  );
}

interface DataTableRowProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  "data-testid"?: string;
}

export function DataTableRow({
  children,
  className,
  onClick,
  ...props
}: DataTableRowProps) {
  return (
    <BaseTableRow
      className={`border-b border-gray-200 dark:border-[#1a1a1a] ${className || ""}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </BaseTableRow>
  );
}

interface DataTableSelectableRowProps {
  children: ReactNode;
  isSelected: boolean;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  "data-testid"?: string;
}

export function DataTableSelectableRow({
  children,
  isSelected,
  onClick,
  className = "",
  disabled = false,
  ...props
}: DataTableSelectableRowProps) {
  const baseClasses =
    "hover:bg-gray-50 dark:hover:bg-accent cursor-pointer group";
  const selectedClasses = isSelected ? "bg-blue-50 dark:bg-accent/50" : "";
  const disabledClasses = disabled ? "opacity-50 pointer-events-none" : "";

  return (
    <DataTableRow
      className={`${baseClasses} ${selectedClasses} ${disabledClasses} ${className}`}
      onClick={disabled ? undefined : onClick}
      {...props}
    >
      {children}
    </DataTableRow>
  );
}

interface DataTableHeadProps {
  children: ReactNode;
  className?: string;
}

export function DataTableHead({ children, className }: DataTableHeadProps) {
  return (
    <BaseTableHead
      className={`bg-white dark:bg-[#121212] dark:text-card-foreground ${className || ""}`}
    >
      {children}
    </BaseTableHead>
  );
}

interface DataTableCellProps {
  children: ReactNode;
  className?: string;
  colSpan?: number;
  onClick?: (e: React.MouseEvent) => void;
}

export function DataTableCell({
  children,
  className,
  colSpan,
  onClick,
}: DataTableCellProps) {
  return (
    <BaseTableCell
      className={`dark:text-card-foreground ${className || ""}`}
      colSpan={colSpan}
      onClick={onClick}
    >
      {children}
    </BaseTableCell>
  );
}

interface DataTableCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  isIndeterminate?: boolean;
}

export function DataTableCheckbox({
  checked,
  onCheckedChange,
  disabled,
  isIndeterminate,
}: DataTableCheckboxProps) {
  return (
    <Checkbox
      checked={checked}
      data-state={
        isIndeterminate ? "indeterminate" : checked ? "checked" : "unchecked"
      }
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 data-[state=indeterminate]:bg-blue-500 data-[state=indeterminate]:border-blue-500 dark:data-[state=checked]:bg-yellow-500 dark:data-[state=checked]:border-yellow-500 dark:data-[state=indeterminate]:bg-yellow-500 dark:data-[state=indeterminate]:border-yellow-500"
    />
  );
}

interface DataTableLoadingProps {
  message?: string;
  colSpan: number;
}

export function DataTableLoading({
  message = "Loading...",
  colSpan,
}: DataTableLoadingProps) {
  return (
    <DataTableRow>
      <DataTableCell colSpan={colSpan} className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
        <p className="text-gray-500 dark:text-muted-foreground">{message}</p>
      </DataTableCell>
    </DataTableRow>
  );
}

// Badge Components
interface BadgeProps {
  children: ReactNode;
  variant?: "success" | "warning" | "error" | "info" | "default" | "primary";
  className?: string;
}

const badgeVariants = {
  success:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  warning:
    "bg-yellow-100 text-yellow-800 dark:bg-accent dark:text-accent-foreground",
  error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  info: "bg-blue-100 text-blue-800 dark:bg-accent dark:text-accent-foreground",
  primary:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  default: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

export function DataTableBadge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`px-2 py-1 rounded text-xs ${badgeVariants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

// Action Button Components
interface ActionButtonProps {
  onClick: (e: React.MouseEvent) => void;
  icon: ReactNode;
  variant?: "danger" | "primary";
  disabled?: boolean;
  className?: string;
}

export function DataTableActionButton({
  onClick,
  icon,
  variant = "primary",
  disabled,
  className = "",
}: ActionButtonProps) {
  const variantClasses = {
    danger: "bg-red-100 dark:bg-red-900/30",
    primary: "bg-blue-100 dark:bg-blue-900/30",
  };

  const iconColorClasses = {
    danger: "text-red-500 dark:text-red-400",
    primary: "text-blue-500 dark:text-blue-400",
  };

  return (
    <button
      className={`p-1 rounded-full ${variantClasses[variant]} opacity-0 group-hover:opacity-100 transition-opacity ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      <div className={iconColorClasses[variant]}>{icon}</div>
    </button>
  );
}

// Search Bar Component
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DataTableSearchBar({
  value,
  onChange,
  placeholder = "Search...",
  disabled,
  className = "",
}: SearchBarProps) {
  return (
    <div className={`relative flex-1 ${className}`}>
      <Search
        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-muted-foreground"
        size={16}
      />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10"
        disabled={disabled}
      />
      {value && (
        <button
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-muted-foreground dark:hover:text-foreground"
          onClick={() => onChange("")}
          disabled={disabled}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

// Bulk Delete Button Component
interface BulkDeleteButtonProps {
  selectedCount: number;
  onDelete: () => void;
  disabled?: boolean;
  isDeleting?: boolean;
  itemName?: string;
}

export function DataTableBulkDeleteButton({
  selectedCount,
  onDelete,
  disabled,
  isDeleting,
  itemName = "item",
}: BulkDeleteButtonProps) {
  if (selectedCount === 0) return null;

  return (
    <Button
      variant="destructive"
      size="sm"
      className="bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 rounded-full flex-shrink-0 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
      onClick={onDelete}
      disabled={disabled || isDeleting}
    >
      {isDeleting ? (
        <Loader2 size={16} className="mr-2 animate-spin" />
      ) : (
        <Trash2 size={16} className="mr-2" />
      )}
      Delete {itemName} ({selectedCount})
    </Button>
  );
}

// Empty State Component
interface EmptyStateProps {
  searchQuery?: string;
  emptyMessage: string;
  searchEmptyMessage?: string;
  colSpan: number;
}

export function DataTableEmptyState({
  searchQuery,
  emptyMessage,
  searchEmptyMessage,
  colSpan,
}: EmptyStateProps) {
  return (
    <DataTableRow>
      <DataTableCell colSpan={colSpan} className="text-center py-8">
        <div className="text-gray-500 dark:text-muted-foreground">
          {searchQuery
            ? searchEmptyMessage || `No results found for "${searchQuery}"`
            : emptyMessage}
        </div>
      </DataTableCell>
    </DataTableRow>
  );
}

// Error State Component
interface ErrorStateProps {
  error: string;
  colSpan: number;
}

export function DataTableErrorState({ error, colSpan }: ErrorStateProps) {
  return (
    <DataTableRow>
      <DataTableCell colSpan={colSpan} className="text-center py-8">
        <div className="text-red-600 dark:text-destructive">
          <p className="font-medium">Error loading data</p>
          <p className="text-sm">{error}</p>
        </div>
      </DataTableCell>
    </DataTableRow>
  );
}

// Actions Container Component
interface DataTableActionsProps {
  children: ReactNode;
}

export function DataTableActions({ children }: DataTableActionsProps) {
  return <div className="flex items-center justify-end gap-2">{children}</div>;
}

// Badge Container Component (for multiple badges/types)
interface DataTableBadgeContainerProps {
  children: ReactNode;
}

export function DataTableBadgeContainer({
  children,
}: DataTableBadgeContainerProps) {
  return <div className="flex flex-wrap gap-1">{children}</div>;
}
