import { N0VA1OGateway } from "@n0va/n0va1o";
import { ConnectedAccountModel } from "../models/ConnectedAccount";
import mongoose from "mongoose";

export class N0VA1OService {
  private gateway: N0VA1OGateway;

  constructor() {
    this.gateway = new N0VA1OGateway();
  }

  async getPlatforms() {
    return this.gateway.getPlatforms();
  }

  async executeAction(
    tenantId: string,
    platform: string,
    action: string,
    params: Record<string, unknown>
  ) {
    const account = await ConnectedAccountModel.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      platform,
      status: "active",
    });

    if (!account) {
      throw new Error(`No active ${platform} account found for tenant`);
    }

    return this.gateway.execute(
      {
        id: `${platform}_${Date.now()}`,
        accountId: account._id.toString(),
        action,
        params,
      },
      {
        id: account._id.toString(),
        tenantId: account.tenantId.toString(),
        platform: account.platform,
        label: account.label,
        status: account.status as any,
        credentials: {
          clientId: "",
          clientSecret: "",
          accessToken: account.credentials.accessToken,
          refreshToken: account.credentials.refreshToken,
          expiresAt: account.credentials.expiresAt,
          scopes: account.credentials.scopes,
        },
        metadata: account.metadata,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      }
    );
  }

  async connectAccount(
    tenantId: string,
    platform: string,
    label: string,
    credentials: { accessToken: string; scopes: string[] }
  ) {
    const account = new ConnectedAccountModel({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      platform,
      label,
      status: "active",
      credentials,
    });
    return account.save();
  }

  async compileRecipe(recipeId: string, steps: any[]): Promise<string> {
    const actions = (steps || []).map((s: any) => `${s.platform}:${s.action}`);
    return this.gateway.compileRecipe(recipeId, actions);
  }

  getGatewayHealth() {
    return this.gateway.getHealth();
  }
}
