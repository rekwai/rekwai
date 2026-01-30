import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteDocument } from "@/lib/api/requirements";
import { toast } from "sonner";

interface UseDocumentDeleteReturn {
  isDeleting: boolean;
  showDeleteDialog: boolean;
  openDeleteDialog: () => void;
  closeDeleteDialog: () => void;
  confirmDelete: () => Promise<void>;
}

export function useDocumentDelete(
  documentId: string,
  productKey: string,
): UseDocumentDeleteReturn {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const openDeleteDialog = () => {
    setShowDeleteDialog(true);
  };

  const closeDeleteDialog = () => {
    setShowDeleteDialog(false);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteDocument(documentId);
      toast.success("Document deleted successfully");
      router.push(`/product/${productKey}/source`);
    } catch (error) {
      console.error("Failed to delete document:", error);
      toast.error("Failed to delete document");
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return {
    isDeleting,
    showDeleteDialog,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
  };
}
