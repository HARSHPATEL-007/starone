import axios, { AxiosInstance } from "axios";
import { ConnectorDefinition, N0VA1ORequest, N0VA1OResponse } from "../types";

export abstract class PlatformConnector {
  protected client: AxiosInstance;
  public definition: ConnectorDefinition;

  constructor(def: ConnectorDefinition) {
    this.definition = def;
    this.client = axios.create({
      baseURL: def.baseUrl,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "N0VA1O-Gateway/3.0",
      },
    });
  }

  abstract authenticate(credentials: Record<string, string>): Promise<string>;
  abstract execute(request: N0VA1ORequest): Promise<N0VA1OResponse>;

  protected async get(
    path: string,
    token: string,
    params?: Record<string, unknown>
  ): Promise<unknown> {
    const response = await this.client.get(path, {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
    return response.data;
  }

  protected async post(
    path: string,
    token: string,
    data?: Record<string, unknown>
  ): Promise<unknown> {
    const response = await this.client.post(path, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  }

  protected async put(
    path: string,
    token: string,
    data?: Record<string, unknown>
  ): Promise<unknown> {
    const response = await this.client.put(path, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  }

  protected async del(
    path: string,
    token: string
  ): Promise<unknown> {
    const response = await this.client.delete(path, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  }
}
