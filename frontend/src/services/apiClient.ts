import axios, { type AxiosInstance } from "axios";

export function createApiClient(): AxiosInstance {
  return axios.create({ baseURL: "/api", timeout: 15_000, headers: { Accept: "application/json" } });
}
