import { getApiUrl } from "@/lib/config/global-config";
import { handleResponse } from "@/lib/api/fetch-utils";

export interface Client {
  id: string;
  name: string;
  client_key: string;
  organization_id: string;
  creation_date: string;
}

export interface ClientCreate {
  name: string;
}

// List all clients
export async function listClients(): Promise<Client[]> {
  const response = await fetch(`${getApiUrl()}/client/`);
  return handleResponse<Client[]>(response);
}

// Create a new client
export async function createClient(clientData: ClientCreate): Promise<Client> {
  const response = await fetch(`${getApiUrl()}/client/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(clientData),
  });
  return handleResponse<Client>(response);
}
