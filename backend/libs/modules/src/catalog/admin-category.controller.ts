import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'

import { ZodValidationPipe } from '@timmyhub/common'
import type {
    CategoryItem,
    CategoryListResult,
    CategoryQuery,
    CreateCategoryInput,
    UpdateCategoryInput,
} from '@timmyhub/contracts'
import { CategoryQuerySchema, CreateCategoryInputSchema, UpdateCategoryInputSchema } from '@timmyhub/contracts'
import { CurrentUser, Permissions } from '@timmyhub/modules/platform/auth'
import type { AuthUser } from '@timmyhub/modules/platform/auth'

import { CatalogService } from './catalog.service'

@Controller('v1/admin/categories')
export class AdminCategoryController {
    // ===== Dependencies =====
    constructor(private readonly catalogService: CatalogService) {}

    // ===== Queries =====

    @Permissions('catalog:categories:create')
    @Get()
    listCategories(
        @Query(new ZodValidationPipe(CategoryQuerySchema)) query: CategoryQuery,
    ): Promise<CategoryListResult> {
        return this.catalogService.listAdminCategories(query)
    }

    @Permissions('catalog:categories:create')
    @Get(':id')
    getCategoryDetail(@Param('id') id: string): Promise<CategoryItem> {
        return this.catalogService.getAdminCategoryDetail(id)
    }

    // ===== Commands =====

    @Permissions('catalog:categories:create')
    @Post()
    createCategory(
        @Body(new ZodValidationPipe(CreateCategoryInputSchema)) body: CreateCategoryInput,
        @CurrentUser() actor: AuthUser,
    ): Promise<CategoryItem> {
        return this.catalogService.createCategory(body, actor.id)
    }

    @Permissions('catalog:categories:update')
    @Patch(':id')
    updateCategory(
        @Param('id') id: string,
        @Body(new ZodValidationPipe(UpdateCategoryInputSchema)) body: UpdateCategoryInput,
        @CurrentUser() actor: AuthUser,
    ): Promise<CategoryItem> {
        return this.catalogService.updateCategory(id, body, actor.id)
    }

    @Permissions('catalog:categories:delete')
    @Delete(':id')
    deleteCategory(@Param('id') id: string, @CurrentUser() actor: AuthUser): Promise<{ success: boolean }> {
        return this.catalogService.deleteCategory(id, actor.id)
    }
}
