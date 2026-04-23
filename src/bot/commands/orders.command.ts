/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import { showOrders } from '../handlers/menu.handler';

export async function handleOrders(ctx: any) {
    return showOrders(ctx);
}


