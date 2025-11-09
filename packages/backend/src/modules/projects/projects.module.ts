import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ProjectContextService } from './services/project-context.service';
import { ProjectContextController } from './controllers/project-context.controller';

@Module({
  controllers: [ProjectsController, ProjectContextController],
  providers: [ProjectsService, ProjectContextService],
  exports: [ProjectsService, ProjectContextService],
})
export class ProjectsModule {}
