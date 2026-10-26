import { Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

import { ZodValidationPipe } from '@timmyhub/common'
import type {
    SearchProductsQuery,
    SearchResponseDto,
    SearchStatusResponseDto,
    SuggestQuery,
    SuggestResponseDto,
} from '@timmyhub/contracts'
import { SearchProductsQuerySchema, SuggestQuerySchema, UserRole } from '@timmyhub/contracts'
import { AuthenticatedOnly, Permissions, Public, Roles } from '@timmyhub/modules/platform/auth'

import { SEARCH_ROUTE } from './search.constants'
import { SearchService } from './search.service'

@ApiTags('Search')
@Controller(SEARCH_ROUTE.ROOT)
export class SearchController {
    // ===== Dependencies =====
    constructor(private readonly searchService: SearchService) {}

    // ===== Queries =====

    @Public()
    @Get()
    @ApiOperation({ summary: 'Tìm kiếm sản phẩm toàn văn với bộ lọc đa tiêu chí' })
    async search(
        @Query(new ZodValidationPipe(SearchProductsQuerySchema)) query: SearchProductsQuery,
    ): Promise<SearchResponseDto> {
        return this.searchService.search(query)
    }

    @Public()
    @Get(SEARCH_ROUTE.SUGGEST)
    @ApiOperation({ summary: 'Gợi ý từ khoá tìm kiếm tự động (autocomplete)' })
    async suggest(@Query(new ZodValidationPipe(SuggestQuerySchema)) query: SuggestQuery): Promise<SuggestResponseDto> {
        return this.searchService.suggest(query.q ?? '')
    }

    @Public()
    @Get(SEARCH_ROUTE.STATUS)
    @ApiOperation({ summary: 'Kiểm tra trạng thái kết nối cluster Elasticsearch' })
    async status(): Promise<SearchStatusResponseDto> {
        return this.searchService.getStatus()
    }

    // ===== Commands =====

    @AuthenticatedOnly()
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @Permissions('catalog:products:update:any')
    @Post(SEARCH_ROUTE.REINDEX)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reindex toàn bộ sản phẩm hợp lệ lên Elasticsearch (Admin)' })
    async reindex(): Promise<{ indexed: number; total: number }> {
        return this.searchService.reindexAll()
    }
}
